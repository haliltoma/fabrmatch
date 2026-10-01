import DomainError from '#exceptions/domain_error'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import fabrmatchConfig from '#config/fabrmatch'
import AuditLog from '#models/audit_log'
import ManufacturerProfile from '#models/manufacturer_profile'
import MakerStatsService, {
  type ManufacturerStats,
} from '#services/manufacturing/maker_stats_service'

export class TrustTierError extends DomainError {}

export const MAX_TIER = 3

/**
 * PRD §10. Tier 1 needs a track record with few disputes, tier 2 adds volume and a high rating.
 * Tier 3 (partner) is never granted or taken by the calculation — only an admin does that.
 */
export function computeTier(stats: ManufacturerStats | undefined): 0 | 1 | 2 {
  if (!stats) return 0
  const rules = fabrmatchConfig.trust
  const disputeRate = stats.total > 0 ? stats.disputed / stats.total : 0
  const cleanRecord = disputeRate * 100 < rules.tier1MaxDisputePercent

  if (stats.completed < rules.tier1MinJobs || !cleanRecord) return 0
  if (
    stats.completed >= rules.tier2MinJobs &&
    stats.avgRating !== null &&
    stats.avgRating >= rules.tier2MinRating
  ) {
    return 2
  }
  return 1
}

export interface TierChange {
  profileId: string
  from: number
  to: number
}

export default class TrustTierService {
  private stats = new MakerStatsService()

  /** Nightly: recompute every active, unlocked maker below partner level. Idempotent. */
  async recomputeAll(): Promise<TierChange[]> {
    const profiles = await ManufacturerProfile.query()
      .where('status', 'active')
      .where('trustTierLocked', false)
      .where('trustTier', '<', MAX_TIER)
      .orderBy('id')
    const stats = await this.stats.load(profiles.map((p) => p.id))

    const changes: TierChange[] = []
    for (const profile of profiles) {
      try {
        const change = await this.apply(profile.id, computeTier(stats.get(profile.id)), stats)
        if (change) changes.push(change)
      } catch (error) {
        logger.error({
          msg: 'trust tier update failed',
          profileId: profile.id,
          error: (error as Error).message,
        })
      }
    }
    return changes
  }

  private async apply(
    profileId: string,
    target: number,
    stats: Map<string, ManufacturerStats>
  ): Promise<TierChange | null> {
    return db.transaction(async (trx) => {
      const profile = await ManufacturerProfile.query({ client: trx })
        .where('id', profileId)
        .forUpdate()
        .firstOrFail()
      // an admin may have pinned it between the read and the lock
      if (profile.trustTierLocked || profile.trustTier >= MAX_TIER) return null
      if (profile.trustTier === target) return null

      const from = profile.trustTier
      profile.trustTier = target
      await profile.useTransaction(trx).save()
      await AuditLog.create(
        {
          actorId: null,
          action: 'trust_tier.changed',
          subjectType: 'manufacturer_profile',
          subjectId: profile.id,
          meta: {
            from,
            to: target,
            by: 'auto',
            // a jump of two levels in one night is worth a second look
            suspicious: Math.abs(target - from) >= 2,
            stats: stats.get(profile.id) ?? null,
          },
        },
        { client: trx }
      )
      return { profileId: profile.id, from, to: target }
    })
  }

  /** Admin override: pins the tier (any 0–3) so the nightly job leaves it alone. */
  async setByAdmin(profileId: string, tier: number, adminId: string, note?: string) {
    if (!Number.isInteger(tier) || tier < 0 || tier > MAX_TIER) {
      throw new TrustTierError(`Tier must be a whole number from 0 to ${MAX_TIER}`)
    }
    await db.transaction(async (trx) => {
      const profile = await ManufacturerProfile.query({ client: trx })
        .where('id', profileId)
        .forUpdate()
        .first()
      if (!profile) throw new TrustTierError('Maker not found')

      const from = profile.trustTier
      profile.trustTier = tier
      profile.trustTierLocked = true
      await profile.useTransaction(trx).save()
      await AuditLog.create(
        {
          actorId: adminId,
          action: 'trust_tier.changed',
          subjectType: 'manufacturer_profile',
          subjectId: profile.id,
          meta: { from, to: tier, by: 'admin', locked: true, note: note?.trim() || null },
        },
        { client: trx }
      )
    })
  }

  /** Hands the tier back to the nightly calculation and applies it right away. */
  async unlock(profileId: string, adminId: string) {
    const stats = await this.stats.load([profileId])
    await db.transaction(async (trx) => {
      const profile = await ManufacturerProfile.query({ client: trx })
        .where('id', profileId)
        .forUpdate()
        .first()
      if (!profile) throw new TrustTierError('Maker not found')
      profile.trustTierLocked = false
      await profile.useTransaction(trx).save()
      await AuditLog.create(
        {
          actorId: adminId,
          action: 'trust_tier.unlocked',
          subjectType: 'manufacturer_profile',
          subjectId: profile.id,
          meta: { tier: profile.trustTier },
        },
        { client: trx }
      )
    })
    // tier 3 stays: the calculation never takes partner status away
    await this.apply(profileId, computeTier(stats.get(profileId)), stats)
  }
}

/** Lowest maker tier allowed to take an order of this size (X-9). Limits are settings-driven. */
export function requiredTierForTotal(totalMinor: number): 0 | 1 | 2 | 3 {
  const rules = fabrmatchConfig.trust
  if (totalMinor <= rules.tier0MaxOrderMinor) return 0
  if (totalMinor <= rules.tier1MaxOrderMinor) return 1
  if (totalMinor <= rules.tier2MaxOrderMinor) return 2
  return 3
}
