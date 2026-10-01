import vine from '@vinejs/vine'

export const quoteValidator = vine.create({
  material: vine.string().trim().minLength(1).maxLength(50),
  quantity: vine.number().positive().max(1000),
  infill: vine.number().min(0.05).max(1.0).optional(),
  printProfileId: vine.string().uuid().optional(),
  finishing: vine.string().trim().toUpperCase().maxLength(32).optional(),
  country: vine.string().trim().fixedLength(2).optional(),
})
