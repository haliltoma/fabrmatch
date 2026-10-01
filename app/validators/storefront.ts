import vine from '@vinejs/vine'
import { moneyMinor } from '#validators/money'

export const shopQueryValidator = vine.create({
  category: vine.string().trim().maxLength(60).optional(),
  tag: vine.string().trim().maxLength(30).optional(),
  q: vine.string().trim().maxLength(100).optional(),
  material: vine.string().trim().toUpperCase().maxLength(32).optional(),
  minPrice: moneyMinor({ min: 0, max: 100_000_000 }).optional(),
  maxPrice: moneyMinor({ min: 0, max: 100_000_000 }).optional(),
  sort: vine.enum(['newest', 'price_asc', 'price_desc'] as const).optional(),
  page: vine.number().min(1).max(1000).withoutDecimals().optional(),
})

export const shopOrderValidator = vine.create({
  material: vine.string().trim().toUpperCase().maxLength(32),
  color: vine.string().trim().toLowerCase().maxLength(32).optional(),
  quantity: vine.number().min(1).max(100).withoutDecimals(),
  currency: vine.enum(['TRY', 'USD', 'EUR', 'GBP'] as const).optional(),
  couponCode: vine.string().trim().maxLength(40).optional(),
  finishing: vine.string().trim().toUpperCase().maxLength(32).optional(),
  finishingColour: vine.string().trim().maxLength(40).optional(),
  acceptTerms: vine.boolean().optional(),
  scalePercent: vine.number().withoutDecimals().min(10).max(300).optional(),
  shippingAddress: vine.object({
    fullName: vine.string().trim().minLength(2).maxLength(120),
    line1: vine.string().trim().minLength(3).maxLength(200),
    line2: vine.string().trim().maxLength(200).optional(),
    district: vine.string().trim().maxLength(80).optional(),
    city: vine.string().trim().minLength(2).maxLength(80),
    postalCode: vine.string().trim().maxLength(16),
    country: vine.string().trim().toUpperCase().fixedLength(2),
    phone: vine.string().trim().maxLength(32).optional(),
  }),
})
