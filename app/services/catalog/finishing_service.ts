import DomainError from '#exceptions/domain_error'
import db from '@adonisjs/lucid/services/db'
import AuditLog from '#models/audit_log'
import FinishingOption from '#models/finishing_option'

export class FinishingError extends DomainError {}

/** Post-processing a buyer can add to a part (sanding, painting…). Priced per unit, done by makers who offer it. */
export default class FinishingService {
  async list(options: { activeOnly?: boolean } = {}) {
    const query = FinishingOption.query().orderBy('priceMinor', 'asc').orderBy('id', 'asc')
    if (options.activeOnly) query.where('isActive', true)
    return query
  }

  /**
   * The option a buyer chose for a material, or null when they chose none. Refuses codes that do not
   * exist, are switched off, or do not suit the material.
   */
  async resolve(
    code: string | null | undefined,
    material: string
  ): Promise<FinishingOption | null> {
    if (!code) return null
    const option = await FinishingOption.findBy('code', code.trim().toUpperCase())
    if (!option || !option.isActive) throw new FinishingError(`Finishing ${code} is not available`)
    const suits = option.materials as string[] | null
    if (suits && !suits.map((m) => m.toUpperCase()).includes(material.toUpperCase())) {
      throw new FinishingError(`${option.name} is not available for ${material.toUpperCase()}`)
    }
    return option
  }

  async create(
    input: {
      code: string
      name: string
      description?: string
      priceMinor: number
      materials?: string[] | null
    },
    adminId: number
  ) {
    const code = input.code.trim().toUpperCase()
    if (!/^[A-Z0-9][A-Z0-9_-]{0,31}$/.test(code)) {
      throw new FinishingError('Code may use letters, digits, - and _ (max 32)')
    }
    if (await FinishingOption.findBy('code', code)) {
      throw new FinishingError(`Option ${code} already exists`)
    }
    if (
      !Number.isInteger(input.priceMinor) ||
      input.priceMinor < 0 ||
      input.priceMinor > 1_000_000
    ) {
      throw new FinishingError('The price must be between 0 and 10,000.00 per unit')
    }
    return db.transaction(async (trx) => {
      const option = await FinishingOption.create(
        {
          code,
          name: input.name.trim(),
          description: input.description?.trim() ?? '',
          priceMinor: input.priceMinor,
          materials: input.materials?.length ? input.materials.map((m) => m.toUpperCase()) : null,
          isActive: true,
        },
        { client: trx }
      )
      await AuditLog.create(
        {
          actorId: adminId,
          action: 'finishing.created',
          subjectType: 'finishing_option',
          subjectId: option.id,
          meta: { code, priceMinor: option.priceMinor },
        },
        { client: trx }
      )
      return option
    })
  }

  /** New orders use the new price; orders already priced keep theirs (frozen on the item). */
  async update(id: number, changes: { priceMinor?: number; isActive?: boolean }, adminId: number) {
    const option = await FinishingOption.findOrFail(id)
    if (changes.priceMinor !== undefined) {
      if (
        !Number.isInteger(changes.priceMinor) ||
        changes.priceMinor < 0 ||
        changes.priceMinor > 1_000_000
      ) {
        throw new FinishingError('The price must be between 0 and 10,000.00 per unit')
      }
      option.priceMinor = changes.priceMinor
    }
    if (changes.isActive !== undefined) option.isActive = changes.isActive
    await option.save()
    await AuditLog.create({
      actorId: adminId,
      action: 'finishing.updated',
      subjectType: 'finishing_option',
      subjectId: option.id,
      meta: { ...changes },
    })
    return option
  }

  async offeredBy(manufacturerProfileId: number): Promise<number[]> {
    const rows = await db
      .from('manufacturer_finishings')
      .where('manufacturer_profile_id', manufacturerProfileId)
      .select('finishing_option_id')
    return rows.map((r) => r.finishing_option_id as number)
  }

  /** A maker declares which finishings they really do; only those are matched to orders that ask for them. */
  async setOffered(manufacturerProfileId: number, optionIds: number[]) {
    const valid = await FinishingOption.query().whereIn('id', optionIds).where('isActive', true)
    await db.transaction(async (trx) => {
      await trx
        .from('manufacturer_finishings')
        .where('manufacturer_profile_id', manufacturerProfileId)
        .delete()
      if (valid.length > 0) {
        await trx.table('manufacturer_finishings').multiInsert(
          valid.map((o) => ({
            manufacturer_profile_id: manufacturerProfileId,
            finishing_option_id: o.id,
          }))
        )
      }
    })
  }
}
