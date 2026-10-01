import vine from '@vinejs/vine'

export const createCatalogProductValidator = vine.create({
  title: vine.string().trim().minLength(2).maxLength(255),
  description: vine.string().trim().maxLength(2000).optional(),
  allowedMaterials: vine.array(vine.string().trim().minLength(1).maxLength(50)),
  modelFileId: vine.string().uuid().optional(),
  categoryId: vine.string().uuid().optional(),
  allowedScales: vine
    .array(vine.number().withoutDecimals().min(10).max(300))
    .maxLength(6)
    .optional(),
  tags: vine.array(vine.string().trim().minLength(2).maxLength(30)).maxLength(8).optional(),
})

export const updateCatalogProductValidator = vine.create({
  title: vine.string().trim().minLength(2).maxLength(255).optional(),
  description: vine.string().trim().maxLength(2000).optional().nullable(),
  allowedMaterials: vine.array(vine.string().trim().minLength(1).maxLength(50)).optional(),
  modelFileId: vine.string().uuid().optional().nullable(),
  categoryId: vine.string().uuid().optional().nullable(),
  allowedScales: vine
    .array(vine.number().withoutDecimals().min(10).max(300))
    .maxLength(6)
    .optional(),
  tags: vine.array(vine.string().trim().minLength(2).maxLength(30)).maxLength(8).optional(),
})
