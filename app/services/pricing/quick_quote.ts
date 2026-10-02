import { roundUnitMinor, type BrowseTerms } from '#services/pricing/pricing_region_service'
import { readFile } from 'node:fs/promises'
import { analyzeTriangles } from '#services/files/stl_analyzer'
import { MeshParseError, parseModel } from '#services/files/mesh_parser'
import { scanUpload, type ModelFormat, type ScanCheck } from '#services/files/file_scanner'
import {
  calculatePrice,
  estimateGrams,
  estimatePrintMinutes,
  type PriceBreakdown,
} from '#services/pricing/price_engine'
import { referencePriceFor, REFERENCE_PRICES } from '#services/pricing/reference_prices'
import ShippingService from '#services/shipping/shipping_service'
import { marketBudget, marketMakers, type MarketMaker } from '#services/pricing/maker_market'

export interface QuickQuote {
  volumeCm3: number
  bboxMm: [number, number, number]
  material: string
  grams: number
  printMinutes: number
  unitPriceMinor: number
  shippingMinor: number
  totalMinor: number
  currency: string
  /** delivery country the price is for (the visitor's likely country) */
  country: string
  warnings: string[]
  /** every FDM material priced by the same engine, so the page can switch without re-uploading */
  options: QuickQuoteOption[]
  /** what the upload scan ran, shown to the visitor */
  security: { checks: ScanCheck[]; engine: 'signatures' | 'clamav' }
}

export interface QuickQuoteOption {
  material: string
  label: string
  grams: number
  printMinutes: number
  /** one printed piece without shipping, and how it splits */
  partMinor: number
  makerMinor: number
  platformMinor: number
  /**
   * Delivered total for each offered quantity (shipping is per parcel, shared by the pieces), and
   * the range makers ask for it (Paket V): the total is what the order will cost, fixed so that
   * most makers' prices fit inside it.
   */
  totals: Array<{
    quantity: number
    totalMinor: number
    shippingMinor: number
    lowMinor: number
    highMinor: number
  }>
  /** makers who print this material where it is delivered (0 = priced at the reference maker) */
  makers: number
}

export const QUICK_QUOTE_QUANTITIES = [1, 2, 5, 10]

export class QuickQuoteError extends Error {
  /** true when the security scan refused the file (the UI shows it in the scan panel) */
  constructor(
    message: string,
    public blocked = false
  ) {
    super(message)
  }
}

const FDM_MATERIALS = ['PLA', 'PETG', 'ABS', 'TPU']

export const QUICK_QUOTE_MATERIALS = FDM_MATERIALS.map((key) => ({
  key,
  label: REFERENCE_PRICES[key].label,
}))

/**
 * Price for a visitor without an account. The file is analysed in memory and thrown away —
 * nothing is stored or shared (business rule 4). STL, 3MF or OBJ, FDM, one piece, delivery in Türkiye;
 * the real quote appears once they sign in and pick their options.
 */
export async function quickQuoteFromFile(input: {
  tmpPath: string
  material: string
  format?: ModelFormat
  /** the visitor's region (P2); without it, delivery in Türkiye at the base reference */
  terms?: BrowseTerms
}): Promise<QuickQuote> {
  const format = input.format ?? 'STL'
  const material = input.material.toUpperCase()
  const reference = referencePriceFor(material)
  const regional = (m: string) =>
    input.terms ? input.terms.referenceFor(m) : (referencePriceFor(m)?.pricePerGramMinor ?? null)
  if (!reference || !FDM_MATERIALS.includes(material)) {
    throw new QuickQuoteError('Pick one of the listed materials')
  }

  const buffer = await readFile(input.tmpPath)
  const verdict = await scanUpload(buffer, format)
  if (!verdict.ok) throw new QuickQuoteError(verdict.reason ?? 'This file cannot be used', true)

  let analysis
  try {
    analysis = analyzeTriangles(parseModel(buffer, format))
  } catch (error) {
    if (error instanceof MeshParseError) throw new QuickQuoteError(error.message)
    throw error
  }
  if (analysis.error) throw new QuickQuoteError(analysis.error)
  if (!analysis.isPrintable) {
    const blocker = analysis.dfmIssues.find((i) => i.level === 'blocker')
    throw new QuickQuoteError(blocker?.message ?? 'This model does not look printable')
  }

  const grams = estimateGrams(analysis.volumeMm3, material)
  const bbox: [number, number, number] = [analysis.bboxXMm, analysis.bboxYMm, analysis.bboxZMm]
  const table = await new ShippingService().table()
  const shippingMinor = table.perUnitMinor({
    country: input.terms?.country ?? 'TR',
    gramsPerUnit: grams,
    bboxMm: bbox,
    quantity: 1,
  })
  const country = input.terms?.country ?? 'TR'
  const rounding = input.terms?.rounding ?? 'none'

  /**
   * One material at every offered quantity, priced like an order (order_pricing.ts): the makers
   * who print it in the delivery country set the maker share; without three of them, the
   * reference maker does.
   */
  const priceOption = (key: string, market: MarketMaker[]) => {
    const g = estimateGrams(analysis.volumeMm3, key)
    const minutes = estimatePrintMinutes(g)
    const base = {
      volumeMm3: analysis.volumeMm3,
      material: key,
      pricePerGramMinor: regional(key)!,
      quantity: 1,
      sellerMarginBps: 0,
      shippingMinor: 0,
      commissionBps: input.terms?.commissionBps,
    }
    const atReference = calculatePrice(base)
    const unitAt = (shareTotal: number, quantity: number) =>
      calculatePrice({ ...base, manufacturerShareMinor: Math.ceil(shareTotal / quantity) })
    const atQuantity = (quantity: number) => {
      const lines = [
        {
          material: key,
          grams: Math.ceil(g) * quantity,
          minutes: minutes * quantity,
          finishingMinor: 0,
        },
      ]
      // no address yet: each maker's price as for another city, so the quote is not too low
      const budget = marketBudget({
        market,
        lines,
        referenceShareMinor: atReference.manufacturerShareMinor * quantity,
        referencePerGram: new Map([[key, regional(key)!]]),
        delivery: { city: null, country },
      })
      const perUnitShipping = table.perUnitMinor({
        country,
        gramsPerUnit: g,
        bboxMm: bbox,
        quantity,
      })
      const delivered = (shareTotal: number) =>
        roundUnitMinor(unitAt(shareTotal, quantity).unitPriceMinor + perUnitShipping, rounding) *
        quantity
      const totalMinor = delivered(budget.budgetMinor)
      return {
        budget,
        part: unitAt(budget.budgetMinor, quantity),
        line: {
          quantity,
          shippingMinor: perUnitShipping * quantity,
          totalMinor,
          lowMinor: Math.min(delivered(budget.lowMinor), totalMinor),
          highMinor: Math.max(delivered(budget.highMinor), totalMinor),
        },
      }
    }
    const lines = QUICK_QUOTE_QUANTITIES.map(atQuantity)
    return { grams: g, minutes, single: lines[0], lines }
  }

  const priced = new Map<string, ReturnType<typeof priceOption>>()
  for (const key of FDM_MATERIALS) {
    const market = await marketMakers({ country, technology: 'FDM', materials: [key] })
    priced.set(key, priceOption(key, market))
  }
  const chosen = priced.get(material)!
  const breakdown: PriceBreakdown = chosen.single.part
  const unitPriceMinor = roundUnitMinor(breakdown.unitPriceMinor + shippingMinor, rounding)

  return {
    volumeCm3: Math.round(analysis.volumeMm3 / 100) / 10,
    bboxMm: bbox.map((n) => Math.round(n * 10) / 10) as [number, number, number],
    material,
    grams: breakdown.estGrams,
    printMinutes: estimatePrintMinutes(grams),
    unitPriceMinor,
    shippingMinor,
    totalMinor: unitPriceMinor,
    currency: breakdown.currency,
    country,
    warnings: analysis.dfmIssues.filter((i) => i.level !== 'info').map((i) => i.message),
    security: { checks: verdict.checks, engine: verdict.engine },
    options: FDM_MATERIALS.map((key) => {
      const option = priced.get(key)!
      return {
        material: key,
        label: REFERENCE_PRICES[key].label,
        grams: option.single.part.estGrams,
        printMinutes: option.minutes,
        partMinor: option.single.part.unitPriceMinor,
        makerMinor: option.single.part.manufacturerShareMinor,
        platformMinor: option.single.part.platformCommissionMinor,
        totals: option.lines.map((l) => l.line),
        makers: option.single.budget.makers,
      }
    }),
  }
}
