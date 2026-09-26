import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import type ManufacturerProfile from '#models/manufacturer_profile'
import User from '#models/user'
import { isEmailVerified } from '#services/identity/email_verification'

export interface SetupStep {
  id: string
  title: string
  detail: string
  href: string
  done: boolean
}

export interface MakerSetup {
  steps: SetupStep[]
  doneCount: number
  complete: boolean
}

/**
 * What a new maker still has to do before offers can reach them, in the order that unblocks the most:
 * approval and e-mail (out of their hands or one click), then a printer, what it prints, free hours.
 * Everything here is read from real data, so a step ticks itself when it is done.
 */
export default class MakerSetupService {
  async forProfile(
    profile: ManufacturerProfile,
    now: DateTime = DateTime.now()
  ): Promise<MakerSetup> {
    const user = await User.find(profile.userId)
    const printers = await db
      .from('printers')
      .where('manufacturer_profile_id', profile.id)
      .where('is_active', true)
      .select('id')
    const printerIds = printers.map((p) => p.id as number)

    const count = async (query: ReturnType<typeof db.from>, column = '*') => {
      const row = await query.count(`${column} as n`).first()
      return Number(row?.n ?? 0)
    }
    const withMaterial =
      printerIds.length === 0
        ? 0
        : await count(db.from('printer_materials').whereIn('printer_id', printerIds))
    const freeHours =
      printerIds.length === 0
        ? 0
        : await count(
            db
              .from('capacity_slots')
              .whereIn('printer_id', printerIds)
              .where('date', '>=', now.toISODate()!)
              .where('date', '<=', now.plus({ days: 14 }).toISODate()!)
              .whereRaw('max_minutes - reserved_minutes > 0')
          )

    const steps: SetupStep[] = [
      {
        id: 'approved',
        title: 'Your account is approved',
        detail:
          'We check every new maker once. You cannot receive offers until this is done — nothing else to do here.',
        href: '/maker',
        done: profile.status === 'active',
      },
      {
        id: 'email',
        title: 'Confirm your e-mail address',
        detail: 'Offers, payouts and dispute notices are sent there. Use the link we e-mailed you.',
        href: '/maker',
        done: !!user && isEmailVerified(user),
      },
      {
        id: 'printer',
        title: 'Add your printer',
        detail:
          'Name it and enter the build volume. Parts that do not fit are never offered to you.',
        href: '/maker/printers',
        done: printerIds.length > 0,
      },
      {
        id: 'materials',
        title: 'Say what it prints',
        detail:
          'Pick the materials and colours you really have, and your price per gram. Orders only reach printers that match.',
        href: '/maker/printers',
        done: withMaterial > 0,
      },
      {
        id: 'capacity',
        title: 'Add free hours',
        detail:
          'Offers only arrive when a printer has free time in the coming days. Fill the next week, or save a weekly template.',
        href: '/maker/capacity',
        done: freeHours > 0,
      },
      {
        id: 'payout',
        title: 'Add your bank account for payouts',
        detail: 'Your share is paid to your bank account (IBAN) once the buyer confirms delivery.',
        href: '/maker/payout',
        done: !!profile.ibanEnc,
      },
    ]
    const doneCount = steps.filter((s) => s.done).length
    return { steps, doneCount, complete: doneCount === steps.length }
  }
}
