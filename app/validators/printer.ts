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
  // reference prices and the matching cap are in TRY: a maker price in anything else would
  // be compared as if it were kuruş
  currency: vine.enum(['TRY'] as const).optional(),
})

export const updateMaterialValidator = vine.create({
  material: vine.string().trim().minLength(1).maxLength(50).optional(),
  colors: vine.array(vine.string().trim().minLength(1).maxLength(30)).optional(),
  pricePerGramMinor: vine.number().positive().optional(),
  // reference prices and the matching cap are in TRY: a maker price in anything else would
  // be compared as if it were kuruş
  currency: vine.enum(['TRY'] as const).optional(),
})

export const profilesValidator = vine.create({
  profileIds: vine.array(vine.number().positive().withoutDecimals()),
})
