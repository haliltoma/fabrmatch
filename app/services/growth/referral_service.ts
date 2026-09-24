import { randomBytes } from 'node:crypto'
import logger from '@adonisjs/core/services/logger'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import fabrmatchConfig from '#config/fabrmatch'
import AuditLog from '#models/audit_log'
import Coupon from '#models/coupon'
import type Order from '#models/order'
import Referral from '#models/referral'
import User from '#models/user'
import CouponService from '#services/pricing/coupon_service'
import { featureEnabled } from '#services/settings/feature_flags'

/** No 0/O/1/I: codes get read out and typed by hand. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const REFERRAL_CODE = /^[A-Z2-9]{8}$/

function randomCode(length: number, prefix = ''): string {
  const bytes = randomBytes(length)
  let out = prefix
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length]
  return out
}

export const normalizeReferralCode = (raw: unknown): string | null => {
  const code = String(raw ?? '')
    .trim()
    .toUpperCase()
  return REFERRAL_CODE.test(code) ? code : null
}

export default class ReferralService {
  private coupons = new CouponService()

  enabled(): boolean {
    return featureEnabled('referrals')
  }

  /** The member's own invite code; created the first time it is needed. */
  async codeFor(user: User): Promise<string> {
    if (user.referralCode) return user.referralCode
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = randomCode(8)
      const taken = await User.findBy('referralCode', code)
      if (taken) continue
      user.referralCode = code
      await user.save()
      return code
    }
    throw new Error('Could not create a referral code')
  }

  private async issue(userId: number, options: { firstOrderOnly: boolean; note: string }) {
    const cfg = fabrmatchConfig.referral
    return this.coupons.create({
      code: randomCode(8, 'INV-'),
      kind: 'fixed',
      value: cfg.rewardMinor,
      minOrderMinor: cfg.minOrderMinor,
      maxRedemptions: 1,
      perUserLimit: 1,
      firstOrderOnly: options.firstOrderOnly,
      endsAt: DateTime.now().plus({ days: cfg.couponDays }),
      note: options.note,
      userId,
    })
  }

  /**
   * At signup: links the new account to whoever invited it and gives the newcomer a personal
   * first-order coupon. Anything odd (program off, unknown code, own code) is ignored quietly, so a
   * bad link can never block a signup.
   */
  async attach(referee: User, rawCode: unknown): Promise<Coupon | null> {
    const code = normalizeReferralCode(rawCode)
    if (!this.enabled() || !code) return null
    const referrer = await User.findBy('referralCode', code)
    if (!referrer || referrer.id === referee.id || referrer.suspendedAt) return null
    if (await Referral.findBy('refereeId', referee.id)) return null

    const coupon = await this.issue(referee.id, {
      firstOrderOnly: true,
      note: `Invite gift for user ${referee.id}`,
    })
    await Referral.create({
      referrerId: referrer.id,
      refereeId: referee.id,
      status: 'pending',
      refereeCouponId: coupon.id,
    })
    return coupon
  }

  /**
   * Called when an order completes (inside its transaction, in a savepoint so a problem here can
   * never undo the completion). Rewards the inviter once, for the friend's first qualifying order.
   */
  async rewardFor(order: Order, trx: TransactionClientContract): Promise<void> {
    if (!this.enabled() || order.channel === 'sample') return
    const cfg = fabrmatchConfig.referral
    if (order.baseTotalMinor < cfg.minOrderMinor) return

    const referral = await Referral.query({ client: trx })
      .where('refereeId', order.buyerId)
      .where('status', 'pending')
      .forUpdate()
      .first()
    if (!referral) return

    const reject = async (reason: string) => {
      referral.status = 'rejected'
      referral.rejectReason = reason
      await referral.useTransaction(trx).save()
    }
    const referrer = await User.query({ client: trx }).where('id', referral.referrerId).first()
    if (!referrer || referrer.suspendedAt || !referrer.emailVerifiedAt) {
      return reject('referrer_not_eligible')
    }
    const earned = await Referral.query({ client: trx })
      .where('referrerId', referrer.id)
      .where('status', 'rewarded')
    if (earned.length >= cfg.maxRewards) return reject('limit_reached')

    const coupon = await this.issue(referrer.id, {
      firstOrderOnly: false,
      note: `Invite reward for user ${referrer.id}`,
    })
    referral.status = 'rewarded'
    referral.referrerCouponId = coupon.id
    referral.rewardedAt = DateTime.now()
    await referral.useTransaction(trx).save()
    await AuditLog.create(
      {
        action: 'referral.rewarded',
        subjectType: 'referral',
        subjectId: referral.id,
        meta: { referrerId: referrer.id, refereeId: referral.refereeId, orderId: order.id },
      },
      { client: trx }
    )
  }

  /** Same call for the state machine: never throws. */
  async rewardSafely(order: Order, trx: TransactionClientContract): Promise<void> {
    try {
      await trx.transaction((inner) => this.rewardFor(order, inner))
    } catch (error) {
      logger.error({
        msg: 'referral reward failed',
        orderId: order.id,
        error: (error as Error).message,
      })
    }
  }

  /** Same as the state-machine hook, for callers that hold no transaction (used by tests and a backfill). */
  async rewardSafelyFor(order: Order): Promise<void> {
    await db.transaction((trx) => this.rewardSafely(order, trx))
  }

  async summary(user: User) {
    const code = await this.codeFor(user)
    const referrals = await Referral.query().where('referrerId', user.id)
    const mine = await Coupon.query().where('userId', user.id).orderBy('id', 'desc')
    const now = DateTime.now()
    return {
      enabled: this.enabled(),
      code,
      invited: referrals.length,
      rewarded: referrals.filter((r) => r.status === 'rewarded').length,
      rewardMinor: fabrmatchConfig.referral.rewardMinor,
      minOrderMinor: fabrmatchConfig.referral.minOrderMinor,
      coupons: mine.map((c) => ({
        code: c.code,
        valueMinor: c.value,
        endsAt: c.endsAt?.toISO() ?? null,
        expired: !!c.endsAt && c.endsAt < now,
        isActive: c.isActive,
      })),
    }
  }
}
