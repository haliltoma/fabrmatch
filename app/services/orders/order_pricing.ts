import DomainError from '#exceptions/domain_error'
import Material from '#models/material'
import type ModelFile from '#models/model_file'
import type { PrinterTechnology } from '#models/printer'
import FinishingService from '#services/catalog/finishing_service'
import PrintProfileService from '#services/catalog/print_profile_service'
import {
  calculatePrice,
  densityRatioToPla,
  estimateGrams,
  estimatePrintMinutes,
} from '#services/pricing/price_engine'
import { discountFor, type CouponRule } from '#services/pricing/coupon_math'
import { BASE_CURRENCY, convertMinor, toBaseMinor } from '#services/pricing/fx'
import FxService, { type LockedRate } from '#services/pricing/fx_service'
import { referencePriceFor } from '#services/pricing/reference_prices'
import SliceEstimateService from '#services/slicing/slice_estimate_service'
import { splitGross, taxRateFor } from '#services/tax/tax'
import ShippingService from '#services/shipping/shipping_service'
import { bboxOf } from '#services/shipping/shipping_table'

export class OrderInputError extends DomainError {}

export interface PricingItemInput {
  file: ModelFile | null
  material: string
  technology?: PrinterTechnology
  color?: string | null
  quantity: number
  infill?: number
  printProfileId?: number | null
  /** post-processing option code (sanding, painting…) */
  finishing?: string | null
  /** paint colour for a finishing that needs one */
  finishingColour?: string | null
  /** size as a percent of the original model, 10–300; volume scales with the cube */
  scalePercent?: number
}

/** Slicer numbers for this model + profile, already scaled to the chosen material; null → use the heuristic. */
export async function slicedNumbers(
  file: { sha256: string },
  profile: { code: string; technology: string } | null,
  material: string
): Promise<{ gramsPerUnit: number; printMinutes: number } | null> {
  if (!profile || profile.technology !== 'FDM') return null
  const cached = await new SliceEstimateService(null).cached(file.sha256, profile.code)
  return cached
    ? {
        gramsPerUnit: (cached.grams + cached.supportGrams) * densityRatioToPla(material),
        printMinutes: cached.printMinutes,
      }
    : null
}

export interface PricedItem {
  scalePercent: number
  modelFileId: number
  technology: PrinterTechnology
  printProfileId: number | null
  finishingCode: string | null
  finishingColour: string | null
  finishingName: string | null
  /** per unit, TRY-converted like the rest; already inside `manufacturerShareMinor` */
  finishingMinor: number
  material: string
  color: string | null
  quantity: number
  estGrams: number
  estPrintMinutes: number
  unitCostMinor: number
  manufacturerShareMinor: number
  /** shipping share for the whole line (unit share × quantity) */
  shippingMinor: number
  platformCommissionMinor: number
  sellerMarginMinor: number
}

export interface PricedOrder {
  taxRateBps: number
  taxMinor: number
  items: PricedItem[]
  technology: PrinterTechnology
  estPrintMinutes: number
  currency: string
  subtotalMinor: number
  shippingMinor: number
  totalMinor: number
  /** already taken off `totalMinor`; funded from the platform fee */
  discountMinor: number
  platformFeeMinor: number
  sellerShareMinor: number
  /** TRY equivalent of `totalMinor` (equal to it for TRY orders): trust-tier and fraud limits, GMV. */
  baseTotalMinor: number
  /** Set for foreign-currency orders: the stored rate row and the locked rate (margin included). */
  fx: LockedRate | null
}

/**
 * Converts the TRY line values into the buyer's currency. Each component is converted on its own and
 * the unit price is their sum, so `unit = share + shipping + commission + margin` still holds exactly.
 */
function convertItems(items: PricedItem[], rateE9: bigint): PricedItem[] {
  return items.map((i) => {
    const shipping = convertMinor(i.shippingMinor / i.quantity, rateE9)
    const commission = convertMinor(i.platformCommissionMinor / i.quantity, rateE9)
    const margin = convertMinor(i.sellerMarginMinor / i.quantity, rateE9)
    const share = convertMinor(i.manufacturerShareMinor, rateE9)
    return {
      ...i,
      manufacturerShareMinor: share,
      finishingMinor: convertMinor(i.finishingMinor, rateE9),
      unitCostMinor: share + shipping + commission + margin,
      shippingMinor: shipping * i.quantity,
      platformCommissionMinor: commission * i.quantity,
      sellerMarginMinor: margin * i.quantity,
    }
  })
}

/**
 * Prices a whole parcel. Every rule of order creation that depends on the model, material, profile
 * or destination lives here, so a cart preview and the real order can never disagree.
 * All items of one order share a technology (one maker prints the whole order) and one parcel.
 */
function scaleBbox(bbox: [number, number, number] | null, percent: number) {
  return bbox ? (bbox.map((d) => (d * percent) / 100) as [number, number, number]) : null
}

export async function priceOrder(input: {
  items: PricingItemInput[]
  country: string
  hasSeller: boolean
  sellerMarginBps?: number
  /** Buyer's currency; TRY (default) or one an admin has enabled. The rate is locked here. */
  currency?: string
  /** a coupon already checked for this buyer (see CouponService.resolve) */
  coupon?: CouponRule
}): Promise<PricedOrder> {
  if (input.items.length === 0) throw new OrderInputError('The order has no items')

  const profiles = new PrintProfileService()
  const slices = new SliceEstimateService(null)
  const prepared = []
  for (const item of input.items) {
    const file = item.file
    if (!file || file.analysisStatus !== 'done' || !file.volumeMm3) {
      throw new OrderInputError('Model file not found or not analyzed')
    }
    if (file.blockedAt) throw new OrderInputError('This model was removed by moderation')
    if (file.isPrintable === false) throw new OrderInputError('Model file is not printable')
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new OrderInputError('Quantity must be a whole number of at least 1')
    }

    const profile = item.printProfileId ? await profiles.resolveForOrder(item.printProfileId) : null
    if (profile) {
      const catalogued = await Material.findBy('code', item.material.toUpperCase())
      if (catalogued && catalogued.technology !== profile.technology) {
        throw new OrderInputError(
          `${catalogued.code} is a ${catalogued.technology} material; the chosen profile is ${profile.technology}`
        )
      }
    }
    const finishingService = new FinishingService()
    const finishing = await finishingService.resolve(item.finishing, item.material)
    const finishingColour = await finishingService.resolveColour(finishing, item.finishingColour)
    const reference = referencePriceFor(item.material)
    if (!reference) throw new OrderInputError(`Unknown material: ${item.material}`)

    const scalePercent = item.scalePercent ?? 100
    if (!Number.isInteger(scalePercent) || scalePercent < 10 || scalePercent > 300) {
      throw new OrderInputError('Size must be between 10% and 300% of the original')
    }
    const k = scalePercent / 100
    const scaledVolume = file.volumeMm3 * k ** 3
    const infill = profile ? profile.infillPercent / 100 : item.infill
    // a slicer result (same model bytes + profile) beats the volume heuristic; otherwise fall back
    const sliced =
      profile && profile.technology === 'FDM' && scalePercent === 100
        ? await slices.cached(file.sha256, profile.code)
        : null
    const heuristicGrams = estimateGrams(scaledVolume, item.material, infill)
    prepared.push({
      sliced,
      finishing,
      finishingColour,
      item,
      file,
      volumeMm3: scaledVolume,
      scalePercent,
      profile,
      infill,
      reference,
      technology: (profile?.technology ?? item.technology ?? 'FDM') as PrinterTechnology,
      timeFactor: (profile?.timeFactorBps ?? 10_000) / 10_000,
      gramsPerUnit: sliced
        ? (sliced.grams + sliced.supportGrams) * densityRatioToPla(item.material)
        : heuristicGrams,
    })
  }

  if (new Set(prepared.map((p) => p.technology)).size > 1) {
    throw new OrderInputError(
      'One order can only hold one technology (FDM, SLA or SLS). Place separate orders.'
    )
  }

  // one parcel: price it once, then share it out by weight (remainder to the first line)
  const table = await new ShippingService().table()
  const parcel = table.parcelForItems(
    input.country,
    prepared.map((p) => ({
      gramsPerUnit: p.gramsPerUnit,
      bboxMm: scaleBbox(bboxOf(p.file), p.scalePercent),
      quantity: p.item.quantity,
    }))
  )
  const weights = prepared.map((p) => p.gramsPerUnit * p.item.quantity)
  const totalWeight = weights.reduce((a, b) => a + b, 0) || 1
  const shares = weights.map((w) => Math.floor((parcel.minor * w) / totalWeight))
  shares[0] += parcel.minor - shares.reduce((a, b) => a + b, 0)

  const tryItems: PricedItem[] = prepared.map((p, i) => {
    const quantity = p.item.quantity
    const perUnitShipping = Math.ceil(shares[i] / quantity)
    const breakdown = calculatePrice({
      volumeMm3: p.volumeMm3,
      material: p.item.material,
      pricePerGramMinor: p.reference.pricePerGramMinor,
      quantity,
      sellerMarginBps: input.sellerMarginBps ?? 0,
      infill: p.infill,
      estGrams: p.sliced ? p.gramsPerUnit : undefined,
      shippingMinor: perUnitShipping,
      finishingMinor: p.finishing?.priceMinor ?? 0,
      estPrintMinutes: p.sliced
        ? p.sliced.printMinutes
        : Math.ceil(estimatePrintMinutes(p.gramsPerUnit) * p.timeFactor),
    })
    return {
      scalePercent: p.scalePercent,
      modelFileId: p.file.id,
      technology: p.technology,
      printProfileId: p.profile?.id ?? null,
      finishingCode: p.finishing?.code ?? null,
      finishingColour: p.finishingColour,
      finishingName: p.finishing?.name ?? null,
      finishingMinor: breakdown.finishingMinor,
      material: p.item.material.toUpperCase(),
      color: p.item.color ?? null,
      quantity,
      estGrams: Math.ceil(breakdown.estGrams),
      estPrintMinutes:
        (p.sliced
          ? p.sliced.printMinutes
          : Math.ceil(estimatePrintMinutes(breakdown.estGrams) * p.timeFactor)) * quantity,
      unitCostMinor: breakdown.unitPriceMinor,
      manufacturerShareMinor: breakdown.manufacturerShareMinor,
      shippingMinor: breakdown.shippingMinor * quantity,
      platformCommissionMinor: breakdown.platformCommissionMinor * quantity,
      sellerMarginMinor: breakdown.sellerMarginMinor * quantity,
    }
  })

  const currency = (input.currency ?? BASE_CURRENCY).toUpperCase()
  const fx = currency === BASE_CURRENCY ? null : await new FxService().lock(currency)
  const items = fx ? convertItems(tryItems, fx.rateE9) : tryItems
  const sumOf = (list: PricedItem[], pick: (i: PricedItem) => number) =>
    list.reduce((a, i) => a + pick(i), 0)
  const sum = (pick: (i: PricedItem) => number) => sumOf(items, pick)
  const listTotal = sum((i) => i.unitCostMinor * i.quantity)
  const shippingMinor = sum((i) => i.shippingMinor)
  const sellerMargin = sum((i) => i.sellerMarginMinor)
  // A seller margin without a seller has nobody to pay, so the platform keeps it.
  const platformFeeBefore =
    sum((i) => i.platformCommissionMinor) + (input.hasSeller ? 0 : sellerMargin)

  const baseListTotal = sumOf(tryItems, (i) => i.unitCostMinor * i.quantity)
  const discountMinor = input.coupon
    ? discountFor(input.coupon, {
        subtotalMinor: listTotal - shippingMinor,
        baseSubtotalMinor: baseListTotal - sumOf(tryItems, (i) => i.shippingMinor),
        platformFeeMinor: platformFeeBefore,
        rateE9: fx?.rateE9 ?? null,
      })
    : 0
  const totalMinor = listTotal - discountMinor
  const baseTotalMinor =
    baseListTotal - (fx ? toBaseMinor(discountMinor, fx.rateE9) : discountMinor)

  const taxRate = await taxRateFor(input.country)
  // VAT is due on what the buyer actually pays
  const tax = splitGross(totalMinor, taxRate.rateBps)
  return {
    taxRateBps: tax.rateBps,
    taxMinor: tax.taxMinor,
    items,
    technology: prepared[0].technology,
    estPrintMinutes: sum((i) => i.estPrintMinutes),
    currency,
    subtotalMinor: totalMinor - shippingMinor,
    shippingMinor,
    totalMinor,
    discountMinor,
    // the coupon is paid out of the platform's fee; makers and the seller are not affected
    platformFeeMinor: platformFeeBefore - discountMinor,
    sellerShareMinor: input.hasSeller ? sellerMargin : 0,
    baseTotalMinor,
    fx,
  }
}
