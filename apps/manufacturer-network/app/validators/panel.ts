import vine from '@vinejs/vine'

export const SUPPORTED_MATERIALS = ['PLA', 'PETG', 'ABS', 'ASA', 'TPU'] as const

export const manufacturerOnboardingValidator = vine.create({
  displayName: vine.string().trim().minLength(2).maxLength(80),
  countryCode: vine.string().trim().fixedLength(2).toUpperCase(),
  city: vine.string().trim().minLength(2).maxLength(80),
  materials: vine.array(vine.enum(SUPPORTED_MATERIALS)).minLength(1).distinct(),
  maxBuildXMm: vine.number().withoutDecimals().min(50).max(2000),
  maxBuildYMm: vine.number().withoutDecimals().min(50).max(2000),
  maxBuildZMm: vine.number().withoutDecimals().min(50).max(2000),
  dailyCapacityGrams: vine.number().withoutDecimals().min(50).max(100_000),
  pricePerGram: vine.number().min(0.01).max(100),
  hourlyRate: vine.number().min(0).max(10_000),
})

export const productionStepValidator = vine.create({
  status: vine.enum(['in_production', 'quality_check', 'shipped', 'delivered'] as const),
  photos: vine.string().trim().maxLength(4000).optional(),
  trackingNumber: vine.string().trim().minLength(3).maxLength(64).optional(),
})

export const photoUrlsValidator = vine.create({
  photos: vine.array(vine.string().url({ require_protocol: true, protocols: ['https'] })).minLength(1).maxLength(10),
})
