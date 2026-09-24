import vine from '@vinejs/vine'

export const couponValidator = vine.create({
  code: vine.string().trim().minLength(3).maxLength(40),
  kind: vine.enum(['percent', 'fixed'] as const),
  /** percent (0.01–100) or a TRY amount, as the admin types it */
  value: vine.number().positive().max(1_000_000),
  minOrder: vine.number().min(0).max(1_000_000).optional(),
  maxDiscount: vine.number().positive().max(1_000_000).optional(),
  maxRedemptions: vine.number().withoutDecimals().positive().max(1_000_000).optional(),
  perUserLimit: vine.number().withoutDecimals().min(1).max(100).optional(),
  firstOrderOnly: vine.boolean().optional(),
  endsAt: vine.date().optional(),
  note: vine.string().trim().maxLength(200).optional(),
})
