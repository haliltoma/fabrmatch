import { convertMinor } from '#services/pricing/fx'

export interface CouponRule {
  kind: 'percent' | 'fixed'
  value: number
  minOrderMinor: number
  maxDiscountMinor: number | null
}

export interface DiscountContext {
  /** items part of the order (shipping excluded) in the order's currency */
  subtotalMinor: number
  /** the same items in TRY, for the minimum-order rule */
  baseSubtotalMinor: number
  /** platform fee still to be earned on this order: the discount can never exceed it */
  platformFeeMinor: number
  /** locked rate for foreign-currency orders; null for TRY */
  rateE9: bigint | null
}

/**
 * The discount a coupon gives on one order, in the order's currency. It is capped by the platform
 * fee, so the makers' and the seller's money is never touched, and by the items themselves so an
 * order can never go below its shipping cost. 0 when the order is below the minimum.
 */
export function discountFor(rule: CouponRule, ctx: DiscountContext): number {
  if (ctx.baseSubtotalMinor < rule.minOrderMinor) return 0
  const local = (tryMinor: number) => (ctx.rateE9 ? convertMinor(tryMinor, ctx.rateE9) : tryMinor)
  let discount =
    rule.kind === 'percent'
      ? Math.floor((ctx.subtotalMinor * rule.value) / 10_000)
      : local(rule.value)
  if (rule.maxDiscountMinor !== null) discount = Math.min(discount, local(rule.maxDiscountMinor))
  return Math.max(0, Math.min(discount, ctx.platformFeeMinor, ctx.subtotalMinor))
}
