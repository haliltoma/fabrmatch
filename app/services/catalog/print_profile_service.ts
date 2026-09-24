import DomainError from '#exceptions/domain_error'
import db from '@adonisjs/lucid/services/db'
import AuditLog from '#models/audit_log'
import PrintProfile from '#models/print_profile'

export class PrintProfileError extends DomainError {}

type Technology = 'FDM' | 'SLA' | 'SLS'

/** Named print quality presets: what a buyer picks and what a maker declares they can produce. */
export default class PrintProfileService {
  async list(options: { activeOnly?: boolean; technology?: Technology } = {}) {
    const query = PrintProfile.query().orderBy('technology').orderBy('layerHeightMicron', 'desc')
    if (options.activeOnly) query.where('isActive', true)
    if (options.technology) query.where('technology', options.technology)
    return query
  }

  async create(
    input: {
      code: string
      name: string
      technology: Technology
      layerHeightMicron: number
      infillPercent: number
      timeFactorBps: number
      postProcess?: string | null
    },
    adminId: number
  ) {
    const code = input.code.trim().toUpperCase()
    if (!/^[A-Z0-9][A-Z0-9_-]{0,31}$/.test(code)) {
      throw new PrintProfileError('Code may use letters, digits, - and _ (max 32)')
    }
    if (await PrintProfile.findBy('code', code)) {
      throw new PrintProfileError(`Profile ${code} already exists`)
    }
    if (input.infillPercent < 1 || input.infillPercent > 100) {
      throw new PrintProfileError('Infill must be between 1 and 100 percent')
    }
    if (input.layerHeightMicron < 10 || input.layerHeightMicron > 1000) {
      throw new PrintProfileError('Layer height must be between 10 and 1000 microns')
    }
    if (input.timeFactorBps < 2000 || input.timeFactorBps > 50000) {
      throw new PrintProfileError('Time factor must be between 0.2× and 5×')
    }

    return db.transaction(async (trx) => {
      const profile = await PrintProfile.create(
        {
          code,
          name: input.name.trim(),
          technology: input.technology,
          layerHeightMicron: input.layerHeightMicron,
          infillPercent: input.infillPercent,
          timeFactorBps: input.timeFactorBps,
          postProcess: input.postProcess?.trim() || null,
          isActive: true,
        },
        { client: trx }
      )
      // makers of that technology keep getting every order unless they opt out
      await trx.rawQuery(
        `insert into printer_print_profiles (printer_id, print_profile_id)
         select id, ? from printers where technology = ? on conflict do nothing`,
        [profile.id, profile.technology]
      )
      await AuditLog.create(
        {
          actorId: adminId,
          action: 'catalog.print_profile_created',
          subjectType: 'catalog',
          subjectId: profile.id,
          meta: { code },
        },
        { client: trx }
      )
      return profile
    })
  }

  async setActive(id: number, isActive: boolean, adminId: number) {
    const profile = await PrintProfile.findOrFail(id)
    profile.isActive = isActive
    await profile.save()
    await AuditLog.create({
      actorId: adminId,
      action: 'catalog.print_profile_toggled',
      subjectType: 'catalog',
      subjectId: id,
      meta: { code: profile.code, isActive },
    })
  }

  /** A buyer's pick must be an active profile. */
  async resolveForOrder(id: number): Promise<PrintProfile> {
    const profile = await PrintProfile.query().where('id', id).where('isActive', true).first()
    if (!profile) throw new PrintProfileError('That print profile is not available')
    return profile
  }

  /** New printers start by offering every active profile of their technology. */
  async offerAllFor(printerId: number, technology: Technology) {
    await db.rawQuery(
      `insert into printer_print_profiles (printer_id, print_profile_id)
       select ?, id from print_profiles where technology = ? and is_active on conflict do nothing`,
      [printerId, technology]
    )
  }

  async offeredIds(printerId: number): Promise<number[]> {
    const rows = await db.from('printer_print_profiles').where('printer_id', printerId)
    return rows.map((r) => r.print_profile_id as number)
  }

  /** The maker's declaration; only active profiles of the printer's own technology count. */
  async setOffered(printerId: number, technology: Technology, profileIds: number[]) {
    const valid = await PrintProfile.query()
      .whereIn('id', profileIds)
      .where('technology', technology)
      .where('isActive', true)
    if (valid.length !== new Set(profileIds).size) {
      throw new PrintProfileError('Pick profiles that match this printer’s technology')
    }
    await db.transaction(async (trx) => {
      await trx.from('printer_print_profiles').where('printer_id', printerId).delete()
      if (valid.length > 0) {
        await trx
          .table('printer_print_profiles')
          .multiInsert(valid.map((p) => ({ printer_id: printerId, print_profile_id: p.id })))
      }
    })
  }
}
