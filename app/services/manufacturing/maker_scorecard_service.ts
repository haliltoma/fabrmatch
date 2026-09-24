import db from '@adonisjs/lucid/services/db'
import fabrmatchConfig from '#config/fabrmatch'
import type ManufacturerProfile from '#models/manufacturer_profile'
import MakerStatsService from '#services/manufacturing/maker_stats_service'

export interface TierRequirement {
  label: string
  current: number | null
  target: number
  unit: '' | '%' | '★'
  met: boolean
}

/** What a maker sees about their own track record — same numbers the matching ranking uses. */
export default class MakerScorecardService {
  async forProfile(profile: ManufacturerProfile) {
    const allStats = await new MakerStatsService().load([profile.id])
    const stats = allStats.get(profile.id)
    const completed = stats?.completed ?? 0
    const disputeRate = stats && stats.total > 0 ? stats.disputed / stats.total : 0
    const onTimeRate = stats && stats.shipped > 0 ? stats.onTime / stats.shipped : null
    const avgRating = stats?.avgRating ?? null

    const offers = await db
      .from('match_offers')
      .where('manufacturer_profile_id', profile.id)
      .select(db.raw(`count(*) filter (where status = 'accepted') as accepted`))
      .select(db.raw(`count(*) filter (where status in ('declined', 'expired')) as missed`))
      .select(
        db.raw(
          `avg(extract(epoch from (responded_at - created_at)) / 60)
             filter (where status = 'accepted' and responded_at is not null) as avg_minutes`
        )
      )
      .first()
    const accepted = Number(offers?.accepted ?? 0)
    const missed = Number(offers?.missed ?? 0)

    return {
      trustTier: profile.trustTier,
      tierLocked: profile.trustTierLocked,
      completedJobs: completed,
      avgRating,
      onTimeRate,
      disputeRate,
      offerAcceptRate: accepted + missed > 0 ? accepted / (accepted + missed) : null,
      avgAcceptMinutes:
        offers?.avg_minutes === null || offers?.avg_minutes === undefined
          ? null
          : Math.round(Number(offers.avg_minutes)),
      nextTier: this.nextTier(profile.trustTier, completed, avgRating, disputeRate),
    }
  }

  /** Requirements for the next automatic tier; null at tier 2+ (3 is by invitation). */
  private nextTier(tier: number, completed: number, avgRating: number | null, disputeRate: number) {
    const rules = fabrmatchConfig.trust
    if (tier >= 2) return null
    const disputePercent = Math.round(disputeRate * 1000) / 10
    const requirements: TierRequirement[] = [
      {
        label: 'Delivered jobs',
        current: completed,
        target: tier === 0 ? rules.tier1MinJobs : rules.tier2MinJobs,
        unit: '',
        met: completed >= (tier === 0 ? rules.tier1MinJobs : rules.tier2MinJobs),
      },
      {
        label: 'Dispute rate below',
        current: disputePercent,
        target: rules.tier1MaxDisputePercent,
        unit: '%',
        met: disputePercent < rules.tier1MaxDisputePercent,
      },
    ]
    if (tier === 1) {
      requirements.push({
        label: 'Average rating',
        current: avgRating === null ? null : Math.round(avgRating * 10) / 10,
        target: rules.tier2MinRating,
        unit: '★',
        met: avgRating !== null && avgRating >= rules.tier2MinRating,
      })
    }
    return { tier: tier + 1, requirements }
  }
}
