import vine from '@vinejs/vine'
import { moneyMinor } from '#validators/money'

const rules = {
  name: vine.string().trim().minLength(2).maxLength(80).optional(),
  currency: vine.string().trim().fixedLength(3).optional(),
  /** comma-separated two-letter codes, as the admin types them */
  countries: vine.string().trim().maxLength(600).optional(),
  /** 100 = the base price level */
  multiplierPercent: vine.number().min(10).max(1000).optional(),
  /** empty = the global commission setting */
  commissionPercent: vine.number().min(0).max(50).nullable().optional(),
  /** TRY as the admin types it → minor units */
  minOrder: moneyMinor({ min: 0, max: 10_000_000 }).optional(),
  rounding: vine.enum(['none', 'whole', 'charm99'] as const).optional(),
}

export const pricingRegionUpdateValidator = vine.create(rules)

export const pricingRegionCreateValidator = vine.create({
  ...rules,
  code: vine.string().trim().minLength(2).maxLength(16),
  name: vine.string().trim().minLength(2).maxLength(80),
})

export const pricingRegionMaterialValidator = vine.create({
  material: vine.string().trim().minLength(2).maxLength(32),
  /** per gram, TRY → minor units; empty clears the region's own price */
  price: moneyMinor({ min: 1, max: 100_000 }).nullable(),
})
