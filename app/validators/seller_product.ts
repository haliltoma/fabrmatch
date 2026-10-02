import vine from '@vinejs/vine'

export const createSellerProductValidator = vine.create({
  catalogProductId: vine.string().uuid().optional(),
  title: vine.string().trim().minLength(2).maxLength(255),
  description: vine.string().trim().maxLength(2000).optional(),
  currency: vine.enum(['TRY', 'USD', 'EUR', 'GBP']).optional(),
  marginBps: vine.number().withoutDecimals().min(0).max(10000).optional(),
  minMakerTier: vine.number().withoutDecimals().min(0).max(3).optional(),
})

export const updateSellerProductValidator = vine.create({
  title: vine.string().trim().minLength(2).maxLength(255).optional(),
  description: vine.string().trim().maxLength(2000).optional().nullable(),
  marginBps: vine.number().withoutDecimals().min(0).max(10000).optional(),
  minMakerTier: vine.number().withoutDecimals().min(0).max(3).optional(),
})
