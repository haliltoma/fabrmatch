import vine from '@vinejs/vine'

export const adminOfferValidator = vine.create({
  manufacturerProfileId: vine.number().positive().withoutDecimals(),
})

export const matchingModeValidator = vine.create({
  auto: vine.boolean(),
})
