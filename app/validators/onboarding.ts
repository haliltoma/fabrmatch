import vine from '@vinejs/vine'

export const roleSelectionValidator = vine.create({
  // `buyer` only wants to order prints: the seller role without a shop profile
  role: vine.enum(['seller', 'manufacturer', 'buyer'] as const),
})

export const sellerProfileValidator = vine.create({
  businessName: vine.string().trim().minLength(2).maxLength(255),
  taxId: vine.string().trim().minLength(10).maxLength(11).optional(),
  // an unticked checkbox is not sent at all, so absent means "no"
  isCorporate: vine.boolean().optional(),
})

export const manufacturerProfileValidator = vine.create({
  city: vine.string().trim().maxLength(100).optional(),
  country: vine.string().trim().fixedLength(2),
  iban: vine.string().trim().minLength(15).maxLength(34).optional(),
  taxId: vine.string().trim().minLength(10).maxLength(11).optional(),
  // an unticked checkbox is not sent at all, so absent means "no"
  isCorporate: vine.boolean().optional(),
})
