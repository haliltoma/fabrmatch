import vine from '@vinejs/vine'
import { moneyMinor } from '#validators/money'

export const couponValidator = vine.create({
  code: vine.string().trim().minLength(3).maxLength(40),
  kind: vine.enum(['percent', 'fixed'] as const),
  /** percent (0.01–100) or a TRY amount, as the admin types it */
  /** a percentage (12.5) or an amount (12.50), both with two decimals → ×100 */
  value: moneyMinor({ min: 1, max: 100_000_000 }),
  minOrder: moneyMinor({ min: 0, max: 100_000_000 }).optional(),
  maxDiscount: moneyMinor({ min: 1, max: 100_000_000 }).optional(),
  maxRedemptions: vine.number().withoutDecimals().positive().max(1_000_000).optional(),
  perUserLimit: vine.number().withoutDecimals().min(1).max(100).optional(),
  firstOrderOnly: vine.boolean().optional(),
  endsAt: vine.date().optional(),
  note: vine.string().trim().maxLength(200).optional(),
})
