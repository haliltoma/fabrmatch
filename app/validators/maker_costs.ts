import vine from '@vinejs/vine'

/** The maker's costs as the page sends them: money in minor units, rates in basis points. */
export const makerCostsValidator = vine.create({
  hourlyRateMinor: vine.number().withoutDecimals().min(0).max(1_000_000),
  setupMinor: vine.number().withoutDecimals().min(0).max(1_000_000),
  wasteBps: vine.number().withoutDecimals().min(0).max(5000),
  failureBps: vine.number().withoutDecimals().min(0).max(5000),
  profitBps: vine.number().withoutDecimals().min(0).max(10_000),
})

/** Paket V (V3): what a maker asks instead of the offer, minor units of the order's currency. */
export const counterOfferValidator = vine.create({
  amountMinor: vine.number().withoutDecimals().positive().max(1_000_000_000),
})
