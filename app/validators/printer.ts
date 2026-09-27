import vine from '@vinejs/vine'

export const createPrinterValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(100),
  printerModelId: vine.number().positive().withoutDecimals().optional().nullable(),
  technology: vine.enum(['FDM', 'SLA', 'SLS'] as const),
  buildVolumeXMm: vine.number().positive().max(2000),
  buildVolumeYMm: vine.number().positive().max(2000),
  buildVolumeZMm: vine.number().positive().max(2000),
})

export const updatePrinterValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(100).optional(),
  printerModelId: vine.number().positive().withoutDecimals().optional().nullable(),
  technology: vine.enum(['FDM', 'SLA', 'SLS'] as const).optional(),
  buildVolumeXMm: vine.number().positive().max(2000).optional(),
  buildVolumeYMm: vine.number().positive().max(2000).optional(),
  buildVolumeZMm: vine.number().positive().max(2000).optional(),
})

export const createMaterialValidator = vine.create({
  material: vine.string().trim().minLength(1).maxLength(50),
  colors: vine.array(vine.string().trim().minLength(1).maxLength(30)),
  pricePerGramMinor: vine.number().positive(),
  currency: vine.string().trim().fixedLength(3).optional(),
})

export const updateMaterialValidator = vine.create({
  material: vine.string().trim().minLength(1).maxLength(50).optional(),
  colors: vine.array(vine.string().trim().minLength(1).maxLength(30)).optional(),
  pricePerGramMinor: vine.number().positive().optional(),
  currency: vine.string().trim().fixedLength(3).optional(),
})

export const profilesValidator = vine.create({
  profileIds: vine.array(vine.number().positive().withoutDecimals()),
})
