import fabrmatchConfig from '#config/fabrmatch'
import type ModelFile from '#models/model_file'
import { estimateGrams, estimatePrintMinutes } from '#services/pricing/price_engine'
import ShippingService from '#services/shipping/shipping_service'
import { bboxOf } from '#services/shipping/shipping_table'
import { splitGross, taxRateFor } from '#services/tax/tax'

export interface RfqPrice {
  unitShareMinor: number
  unitCommissionMinor: number
  unitShippingMinor: number
  unitPriceMinor: number
  quantity: number
  totalMinor: number
  shippingMinor: number
  subtotalMinor: number
  platformFeeMinor: number
  taxRateBps: number
  taxMinor: number
  estGrams: number
  /** for the whole line */
  estPrintMinutes: number
  currency: 'TRY'
}

/**
 * What the buyer pays for an awarded bid. The maker's unit price is theirs to keep; the platform
 * fee (same rate as any order) and the parcel's shipping are added on top, and VAT is inside the total.
 */
export async function priceAwardedBid(input: {
  file: ModelFile
  material: string
  quantity: number
  unitShareMinor: number
  country: string
}): Promise<RfqPrice> {
  const { file, quantity, unitShareMinor } = input
  const gramsPerUnit = estimateGrams(file.volumeMm3 ?? 0, input.material)
  const table = await new ShippingService().table()
  const parcel = table.parcelForItems(input.country, [
    { gramsPerUnit, bboxMm: bboxOf(file), quantity },
  ])
  const unitShippingMinor = Math.ceil(parcel.minor / quantity)
  const unitCommissionMinor = Math.ceil(
    (unitShareMinor * fabrmatchConfig.pricing.commissionBps) / 10_000
  )
  const unitPriceMinor = unitShareMinor + unitCommissionMinor + unitShippingMinor
  const totalMinor = unitPriceMinor * quantity
  const shippingMinor = unitShippingMinor * quantity
  const rate = await taxRateFor(input.country)
  const tax = splitGross(totalMinor, rate.rateBps)
  return {
    unitShareMinor,
    unitCommissionMinor,
    unitShippingMinor,
    unitPriceMinor,
    quantity,
    totalMinor,
    shippingMinor,
    subtotalMinor: totalMinor - shippingMinor,
    platformFeeMinor: unitCommissionMinor * quantity,
    taxRateBps: tax.rateBps,
    taxMinor: tax.taxMinor,
    estGrams: Math.ceil(gramsPerUnit),
    estPrintMinutes: estimatePrintMinutes(gramsPerUnit) * quantity,
    currency: 'TRY',
  }
}
