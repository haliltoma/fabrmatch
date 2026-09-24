import vine from '@vinejs/vine'

export const createCatalogProductValidator = vine.create({
  title: vine.string().trim().minLength(2).maxLength(255),
  description: vine.string().trim().maxLength(2000).optional(),
  allowedMaterials: vine.array(vine.string().trim().minLength(1).maxLength(50)),
  modelFileId: vine.number().positive().withoutDecimals().optional(),
  categoryId: vine.number().positive().withoutDecimals().optional(),
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
  modelFileId: vine.number().positive().withoutDecimals().optional().nullable(),
  categoryId: vine.number().positive().withoutDecimals().optional().nullable(),
  allowedScales: vine
    .array(vine.number().withoutDecimals().min(10).max(300))
    .maxLength(6)
    .optional(),
  tags: vine.array(vine.string().trim().minLength(2).maxLength(30)).maxLength(8).optional(),
})
