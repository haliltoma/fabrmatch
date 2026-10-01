import { DateTime } from 'luxon'
import ManufacturerProfile from '#models/manufacturer_profile'
import MatchOffer from '#models/match_offer'
import ProductionJob from '#models/production_job'

export type MakerAttentionItem = {
  key: 'offers' | 'overdue' | 'ship' | 'start'
  count: number
  /** English source text; the page translates it. */
  label: string
  href: string
}

export type MakerAttention = {
  /** Menu badge on Work: offers that will expire plus jobs already late. */
  badges: { work: number }
  /** "Next up" on the maker dashboard, most time-critical first. */
  items: MakerAttentionItem[]
}

/**
 * What a maker has to do now, for the dashboard and the menu badge. Offers come first because
 * they expire within minutes; then late jobs, parts waiting to be shipped, and accepted jobs not
 * started yet.
 */
export default class MakerAttentionService {
  async forUser(userId: string): Promise<MakerAttention | null> {
    const profile = await ManufacturerProfile.query().where('userId', userId).select('id').first()
    return profile ? this.forProfile(profile.id) : null
  }

  async forProfile(profileId: string, now: DateTime = DateTime.now()): Promise<MakerAttention> {
    const jobs = () => ProductionJob.query().where('manufacturerProfileId', profileId)
    const [offerRow, overdueRow, shipRow, startRow] = await Promise.all([
      MatchOffer.query()
        .where('manufacturerProfileId', profileId)
        .where('status', 'pending')
        .where('expiresAt', '>', now.toSQL()!)
        .count('* as n')
        .first(),
      jobs()
        .whereIn('status', ['accepted', 'printing', 'produced'])
        .where('dueAt', '<', now.toSQL()!)
        .count('* as n')
        .first(),
      jobs().where('status', 'produced').count('* as n').first(),
      jobs().where('status', 'accepted').count('* as n').first(),
    ])
    const [offers, overdue, ship, start] = [offerRow, overdueRow, shipRow, startRow].map((r) =>
      Number(r?.$extras.n ?? 0)
    )
    const all: MakerAttentionItem[] = [
      {
        key: 'offers',
        count: offers,
        label: 'Offers waiting for your answer',
        href: '/maker/work',
      },
      { key: 'overdue', count: overdue, label: 'Jobs past their due date', href: '/maker/work' },
      { key: 'ship', count: ship, label: 'Parts ready to ship', href: '/maker/work' },
      { key: 'start', count: start, label: 'Accepted jobs to start printing', href: '/maker/work' },
    ]
    return { badges: { work: offers + overdue }, items: all.filter((i) => i.count > 0) }
  }
}
