import vine from '@vinejs/vine'

export const adminOfferValidator = vine.create({
  manufacturerProfileId: vine.string().uuid(),
})

export const matchingModeValidator = vine.create({
  auto: vine.boolean(),
})
