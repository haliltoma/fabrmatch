import app from '@adonisjs/core/services/app'
import limiter from '@adonisjs/limiter/services/main'
import DomainError from '#exceptions/domain_error'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import Coupon from '#models/coupon'
import CouponRedemption from '#models/coupon_redemption'
import type User from '#models/user'

export class CouponError extends DomainError {}

/** A draft that was never paid stops holding a coupon after this long. */
const DRAFT_HOLD_HOURS = 24

export interface CouponInput {
  code: string
  kind: 'percent' | 'fixed'
  value: number
  minOrderMinor?: number
  maxDiscountMinor?: number | null
  maxRedemptions?: number | null
  perUserLimit?: number
  firstOrderOnly?: boolean
  startsAt?: DateTime | null
  endsAt?: DateTime | null
  note?: string | null
  /** personal coupon: only this user can use it */
  userId?: number | null
}

export const normalizeCode = (code: string) => code.trim().toUpperCase()

export default class CouponService {
  async create(input: CouponInput): Promise<Coupon> {
    const code = normalizeCode(input.code)
    if (!/^[A-Z0-9_-]{3,40}$/.test(code)) {
      throw new CouponError('Use 3–40 letters, digits, dash or underscore for the code')
    }
    if (input.kind === 'percent' && !(input.value >= 1 && input.value <= 10_000)) {
      throw new CouponError('A percentage must be between 0.01% and 100%')
    }
    if (input.kind === 'fixed' && !(input.value >= 1)) {
      throw new CouponError('The amount must be positive')
    }
    if (await Coupon.findBy('code', code)) throw new CouponError('That code already exists')
    return Coupon.create({
      code,
      kind: input.kind,
      value: input.value,
      minOrderMinor: input.minOrderMinor ?? 0,
      maxDiscountMinor: input.maxDiscountMinor ?? null,
      maxRedemptions: input.maxRedemptions ?? null,
      perUserLimit: input.perUserLimit ?? 1,
      firstOrderOnly: input.firstOrderOnly ?? false,
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
      isActive: true,
      note: input.note ?? null,
      userId: input.userId ?? null,
    })
  }

  async setActive(id: number, active: boolean): Promise<void> {
    const coupon = await Coupon.findOrFail(id)
    coupon.isActive = active
    await coupon.save()
  }

  async list() {
    const coupons = await Coupon.query().orderBy('id', 'desc')
    const used = await this.usedCounts(coupons.map((c) => c.id))
    return coupons.map((c) => ({ coupon: c, used: used.get(c.id) ?? 0 }))
  }

  /** Redemptions that still count: not cancelled, and not a long-abandoned draft. */
  private async usedCounts(couponIds: number[], userId?: number, trx?: TransactionClientContract) {
    if (couponIds.length === 0) return new Map<number, number>()
    const client = trx ?? db
    const query = client
      .from('coupon_redemptions as r')
      .join('orders as o', 'o.id', 'r.order_id')
      .whereIn('r.coupon_id', couponIds)
      .whereNot('o.status', 'cancelled')
      .whereRaw(`not (o.status = 'draft' and o.created_at < ?)`, [
        DateTime.now().minus({ hours: DRAFT_HOLD_HOURS }).toSQL(),
      ])
      .groupBy('r.coupon_id')
      .select('r.coupon_id')
      .count('* as n')
    if (userId) query.where('r.user_id', userId)
    const rows = await query
    return new Map<number, number>(rows.map((r) => [Number(r.coupon_id), Number(r.n)]))
  }

  /**
   * Checks a code for a buyer. Throws a CouponError with a reason the buyer can act on. With `trx`
   * the coupon row is locked first, so two orders cannot both take the last redemption.
   */
  async resolve(rawCode: string, user: User, trx?: TransactionClientContract): Promise<Coupon> {
    const query = Coupon.query(trx ? { client: trx } : undefined).where(
      'code',
      normalizeCode(rawCode)
    )
    if (trx) query.forUpdate()
    const coupon = await query.first()
    // a personal coupon looks like an unknown code to everyone else
    if (!coupon || !coupon.isActive || (coupon.userId !== null && coupon.userId !== user.id)) {
      // guessing codes is slow: 20 misses an hour per buyer (redis is shared, so not applied in tests)
      if (!app.inTest) {
        await limiter.use({ requests: 20, duration: '1 hour' }).consume(`coupon-miss:${user.id}`)
      }
      throw new CouponError('This code is not valid')
    }

    const now = DateTime.now()
    if (coupon.startsAt && coupon.startsAt > now)
      throw new CouponError('This code is not active yet')
    if (coupon.endsAt && coupon.endsAt < now) throw new CouponError('This code has expired')

    if (coupon.maxRedemptions !== null) {
      const all = await this.usedCounts([coupon.id], undefined, trx)
      const used = all.get(coupon.id) ?? 0
      if (used >= coupon.maxRedemptions) throw new CouponError('This code has been used up')
    }
    const own = await this.usedCounts([coupon.id], user.id, trx)
    const mine = own.get(coupon.id) ?? 0
    if (mine >= coupon.perUserLimit) throw new CouponError('You have already used this code')

    if (coupon.firstOrderOnly) {
      const client = trx ?? db
      const prior = await client
        .from('orders')
        .where('buyer_id', user.id)
        .whereNotIn('status', ['draft', 'cancelled'])
        .first()
      if (prior) throw new CouponError('This code is for your first order only')
    }
    return coupon
  }

  async redeem(
    coupon: Coupon,
    user: User,
    orderId: number,
    discountMinor: number,
    trx: TransactionClientContract
  ) {
    await CouponRedemption.create(
      { couponId: coupon.id, userId: user.id, orderId, discountMinor },
      { client: trx }
    )
  }
}
