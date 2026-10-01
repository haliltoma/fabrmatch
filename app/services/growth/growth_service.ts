import DomainError from '#exceptions/domain_error'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import Lead from '#models/lead'
import MarketingEvent from '#models/marketing_event'
import type User from '#models/user'
import type { Attribution } from '#services/growth/attribution'

export class GrowthError extends DomainError {}

/** Bump when the wording of the consent checkbox changes; the stored version proves what was agreed to. */
export const CONSENT_VERSION = '2026-09-a'

export const EVENT_NAMES = [
  'landing_view',
  'waitlist_signup',
  'signup',
  'first_quote',
  'order_paid',
] as const
export type EventName = (typeof EVENT_NAMES)[number]

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export default class GrowthService {
  /** Idempotent per e-mail + interest; the second sign-up keeps the first record and its consent. */
  async joinWaitlist(input: {
    email: string
    interest: 'maker' | 'seller' | 'buyer'
    city?: string | null
    consent: boolean
    attribution?: Attribution | null
    referrerHost?: string | null
  }): Promise<{ created: boolean }> {
    if (!input.consent) throw new GrowthError('Please tick the box so we may e-mail you')
    const email = input.email.trim().toLowerCase()
    if (!EMAIL.test(email) || email.length > 254)
      throw new GrowthError('Enter a valid e-mail address')

    const existing = await db
      .from('leads')
      .whereRaw('lower(email) = ?', [email])
      .where('interest', input.interest)
      .first()
    if (existing) return { created: false }

    await Lead.create({
      email,
      interest: input.interest,
      city: input.city?.trim().slice(0, 80) || null,
      utmSource: input.attribution?.source ?? null,
      utmMedium: input.attribution?.medium ?? null,
      utmCampaign: input.attribution?.campaign ?? null,
      referrerHost: input.referrerHost ?? null,
      consentAt: DateTime.now(),
      consentVersion: CONSENT_VERSION,
    })
    await this.track('waitlist_signup', input.attribution ?? null, `/for-${input.interest}s`)
    return { created: true }
  }

  /** Real count for the landing pages; null below 1 so nothing empty is advertised. */
  async waitingCount(interest: 'maker' | 'seller'): Promise<number | null> {
    const row = await Lead.query().where('interest', interest).count('* as n').first()
    const n = Number(row?.$extras.n ?? 0)
    return n > 0 ? n : null
  }

  /** Anonymous funnel event: campaign labels and a path only — no user, e-mail or IP. */
  async track(name: EventName, attribution: Attribution | null, path?: string) {
    await MarketingEvent.create({
      name,
      source: attribution?.source ?? null,
      medium: attribution?.medium ?? null,
      campaign: attribution?.campaign ?? null,
      path: path?.slice(0, 120) ?? null,
    })
  }

  /** Stores the first touch on the new account so later orders can be credited to it. */
  async creditSignup(user: User, attribution: Attribution | null) {
    if (attribution) {
      user.firstTouchSource = attribution.source
      user.firstTouchMedium = attribution.medium
      user.firstTouchCampaign = attribution.campaign
      await user.save()
    }
    await this.track('signup', attribution)
  }

  firstTouchOf(user: User): Attribution | null {
    return user.firstTouchSource
      ? {
          source: user.firstTouchSource,
          medium: user.firstTouchMedium,
          campaign: user.firstTouchCampaign,
        }
      : null
  }

  /** Funnel by source for the last N days: each step counted from events. */
  /**
   * Maker activation (M1-T3): of the makers approved in the last `cohortDays`, how many are ready to
   * receive offers — an active printer that offers a material and has free hours — and how many got
   * there within `targetDays` of signing up. Read from real data, no events needed.
   */
  async makerActivation(cohortDays = 90, targetDays = 14, now: DateTime = DateTime.now()) {
    const result = await db.rawQuery(
      `select mp.id, mp.created_at,
              (select min(cs.created_at)
                 from capacity_slots cs
                 join printers p on p.id = cs.printer_id
                where p.manufacturer_profile_id = mp.id and p.is_active
                  and cs.max_minutes > 0
                  and exists (select 1 from printer_materials pm where pm.printer_id = p.id)) as ready_at
         from manufacturer_profiles mp
        where mp.status = 'active' and mp.created_at >= ?`,
      [now.minus({ days: cohortDays }).toSQL()!]
    )
    const rows = result.rows as Array<{ id: string; created_at: Date; ready_at: Date | null }>
    const ready = rows.filter((r) => r.ready_at !== null)
    const withinTarget = ready.filter(
      (r) =>
        DateTime.fromJSDate(new Date(r.ready_at!)) <=
        DateTime.fromJSDate(new Date(r.created_at)).plus({ days: targetDays })
    )
    return {
      cohortDays,
      targetDays,
      makers: rows.length,
      ready: ready.length,
      readyWithinTarget: withinTarget.length,
    }
  }

  async funnel(days = 30, now: DateTime = DateTime.now()) {
    const since = now.minus({ days }).toSQL()!
    const result = await db.rawQuery(
      `select coalesce(source, '(direct)') as source, name, count(*) as n
         from marketing_events where created_at >= ? group by 1, 2`,
      [since]
    )
    const rows = result.rows as Array<{ source: string; name: string; n: string }>
    const bySource = new Map<string, Record<string, number>>()
    for (const r of rows) {
      const entry = bySource.get(r.source) ?? {}
      entry[r.name] = Number(r.n)
      bySource.set(r.source, entry)
    }
    return [...bySource.entries()]
      .map(([source, counts]) => ({
        source,
        counts: Object.fromEntries(EVENT_NAMES.map((n) => [n, counts[n] ?? 0])) as Record<
          EventName,
          number
        >,
      }))
      .sort(
        (a, b) =>
          b.counts.landing_view + b.counts.signup - (a.counts.landing_view + a.counts.signup)
      )
  }

  async leadTotals() {
    const rows = await db.from('leads').select('interest').count('* as n').groupBy('interest')
    return Object.fromEntries(rows.map((r) => [r.interest as string, Number(r.n)]))
  }
}
