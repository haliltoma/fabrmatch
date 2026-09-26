import vine from '@vinejs/vine'

/** What the API accepts; whether one is switched on is decided when the order is priced. */
const CURRENCIES = ['TRY', 'USD', 'EUR', 'GBP'] as const

export const createOrderValidator = vine.create({
  modelFileId: vine.number().positive().withoutDecimals(),
  material: vine.string().trim().toUpperCase().maxLength(32),
  color: vine.string().trim().toLowerCase().maxLength(32).optional(),
  quantity: vine.number().min(1).max(1000).withoutDecimals(),
  infill: vine.number().min(0.05).max(1).optional(),
  printProfileId: vine.number().positive().withoutDecimals().optional(),
  finishing: vine.string().trim().toUpperCase().maxLength(32).optional(),
  finishingColour: vine.string().trim().maxLength(40).optional(),
  currency: vine.enum(CURRENCIES).optional(),
  couponCode: vine.string().trim().maxLength(40).optional(),
  acceptTerms: vine.boolean().optional(),
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

/** Pay step (iyzico): identity number and phone go to the provider only, never stored. */
export const payValidator = vine.create({
  identityNumber: vine.string().trim().maxLength(20).optional(),
  phone: vine.string().trim().maxLength(32).optional(),
})

export const reviewValidator = vine.create({
  rating: vine.number().min(1).max(5).withoutDecimals(),
  comment: vine.string().trim().maxLength(1000).optional(),
})

export const shipValidator = vine.create({
  carrier: vine.string().trim().minLength(2).maxLength(64),
  trackingNumber: vine.string().trim().minLength(3).maxLength(64),
})

export const openDisputeValidator = vine.create({
  reason: vine.string().trim().minLength(10).maxLength(2000),
})

export const respondDisputeValidator = vine.create({
  response: vine.string().trim().minLength(5).maxLength(2000),
})

export const evidenceUploadValidator = vine.create({
  contentType: vine.string().trim().maxLength(64),
})

export const registerEvidenceValidator = vine.create({
  storageKey: vine.string().trim().maxLength(512),
  note: vine.string().trim().maxLength(500).optional(),
})

export const resolveDisputeValidator = vine.create({
  resolution: vine.enum(['full_refund', 'partial_refund', 'release', 'reproduce'] as const),
  refundMinor: vine.number().positive().withoutDecimals().optional(),
  note: vine.string().trim().maxLength(2000).optional(),
})

export const pageQueryValidator = vine.create({
  page: vine.number().min(1).max(10_000).withoutDecimals().optional(),
})

export const sellerOrdersQueryValidator = vine.create({
  page: vine.number().min(1).max(10_000).withoutDecimals().optional(),
  status: vine
    .enum([
      'paid',
      'matching',
      'unmatched',
      'in_production',
      'shipped',
      'delivered',
      'completed',
      'disputed',
      'resolved',
      'cancelled',
    ] as const)
    .optional(),
})

export const addressRules = () =>
  vine.object({
    fullName: vine.string().trim().minLength(2).maxLength(120),
    line1: vine.string().trim().minLength(3).maxLength(200),
    line2: vine.string().trim().maxLength(200).optional(),
    district: vine.string().trim().maxLength(80).optional(),
    city: vine.string().trim().minLength(2).maxLength(80),
    postalCode: vine.string().trim().maxLength(16),
    country: vine.string().trim().toUpperCase().fixedLength(2),
    phone: vine.string().trim().maxLength(32).optional(),
  })

export const cartAddValidator = vine.create({
  modelFileId: vine.number().positive().withoutDecimals(),
  material: vine.string().trim().toUpperCase().maxLength(32),
  quantity: vine.number().min(1).max(1000).withoutDecimals(),
  infill: vine.number().min(0.05).max(1).optional(),
  printProfileId: vine.number().positive().withoutDecimals().optional(),
  finishing: vine.string().trim().toUpperCase().maxLength(32).optional(),
  finishingColour: vine.string().trim().maxLength(40).optional(),
  color: vine.string().trim().maxLength(40).optional(),
})

export const cartQuantityValidator = vine.create({
  quantity: vine.number().min(1).max(1000).withoutDecimals(),
})

export const cartCheckoutValidator = vine.create({
  shippingAddress: addressRules(),
  currency: vine.enum(CURRENCIES).optional(),
  couponCode: vine.string().trim().maxLength(40).optional(),
  acceptTerms: vine.boolean().optional(),
})

export const sampleOrderValidator = vine.create({
  material: vine.string().trim().toUpperCase().maxLength(32),
  color: vine.string().trim().maxLength(40).optional(),
  shippingAddress: addressRules(),
})
