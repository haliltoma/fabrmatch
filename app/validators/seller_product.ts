import vine from '@vinejs/vine'

export const createSellerProductValidator = vine.create({
  catalogProductId: vine.string().uuid(),
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
  shopListed: vine.boolean().optional(),
  // own designs only (W1): what the product is offered in
  materials: vine
    .array(vine.string().trim().minLength(2).maxLength(20))
    .minLength(1)
    .maxLength(10)
    .optional(),
  scales: vine.array(vine.number().withoutDecimals().min(10).max(300)).maxLength(6).optional(),
  tags: vine.array(vine.string().trim().minLength(2).maxLength(30)).maxLength(8).optional(),
})

/** W1: a product from one of the seller's own uploaded models. */
export const createSellerDesignValidator = vine.create({
  modelFileId: vine.string().uuid(),
  title: vine.string().trim().minLength(2).maxLength(255),
  description: vine.string().trim().maxLength(2000).optional(),
  materials: vine.array(vine.string().trim().minLength(2).maxLength(20)).minLength(1).maxLength(10),
  scales: vine.array(vine.number().withoutDecimals().min(10).max(300)).maxLength(6).optional(),
  categoryId: vine.string().uuid().optional(),
  tags: vine.array(vine.string().trim().minLength(2).maxLength(30)).maxLength(8).optional(),
  marginBps: vine.number().withoutDecimals().min(0).max(10000).optional(),
  minMakerTier: vine.number().withoutDecimals().min(0).max(3).optional(),
  shopListed: vine.boolean().optional(),
  // the seller states they may sell prints of it (their own work or licensed for it)
  rightsConfirmed: vine.accepted(),
})
