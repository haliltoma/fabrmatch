import { readFile } from 'node:fs/promises'
import { analyzeStl } from '#services/files/stl_analyzer'
import { scanModelFile } from '#services/files/file_scanner'
import {
  calculatePrice,
  estimateGrams,
  estimatePrintMinutes,
  type PriceBreakdown,
} from '#services/pricing/price_engine'
import { referencePriceFor, REFERENCE_PRICES } from '#services/pricing/reference_prices'
import ShippingService from '#services/shipping/shipping_service'

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
  warnings: string[]
}

export class QuickQuoteError extends Error {}

const FDM_MATERIALS = ['PLA', 'PETG', 'ABS', 'TPU']

export const QUICK_QUOTE_MATERIALS = FDM_MATERIALS.map((key) => ({
  key,
  label: REFERENCE_PRICES[key].label,
}))

/**
 * Price for a visitor without an account. The file is analysed in memory and thrown away —
 * nothing is stored or shared (business rule 4). FDM STL only, one piece, delivery in Türkiye;
 * the real quote appears once they sign in and pick their options.
 */
export async function quickQuoteFromFile(input: {
  tmpPath: string
  material: string
}): Promise<QuickQuote> {
  const material = input.material.toUpperCase()
  const reference = referencePriceFor(material)
  if (!reference || !FDM_MATERIALS.includes(material)) {
    throw new QuickQuoteError('Pick one of the listed materials')
  }

  const buffer = await readFile(input.tmpPath)
  const verdict = scanModelFile(buffer, 'STL')
  if (!verdict.ok) throw new QuickQuoteError(verdict.reason ?? 'This file cannot be used')

  const analysis = analyzeStl(buffer)
  if (analysis.error) throw new QuickQuoteError(analysis.error)
  if (!analysis.isPrintable) {
    const blocker = analysis.dfmIssues.find((i) => i.level === 'blocker')
    throw new QuickQuoteError(blocker?.message ?? 'This model does not look printable')
  }

  const grams = estimateGrams(analysis.volumeMm3, material)
  const bbox: [number, number, number] = [analysis.bboxXMm, analysis.bboxYMm, analysis.bboxZMm]
  const table = await new ShippingService().table()
  const shippingMinor = table.perUnitMinor({
    country: 'TR',
    gramsPerUnit: grams,
    bboxMm: bbox,
    quantity: 1,
  })
  const breakdown: PriceBreakdown = calculatePrice({
    volumeMm3: analysis.volumeMm3,
    material,
    pricePerGramMinor: reference.pricePerGramMinor,
    quantity: 1,
    sellerMarginBps: 0,
    shippingMinor,
  })

  return {
    volumeCm3: Math.round(analysis.volumeMm3 / 100) / 10,
    bboxMm: bbox.map((n) => Math.round(n * 10) / 10) as [number, number, number],
    material,
    grams: breakdown.estGrams,
    printMinutes: estimatePrintMinutes(grams),
    unitPriceMinor: breakdown.unitPriceMinor,
    shippingMinor: breakdown.shippingMinor,
    totalMinor: breakdown.totalPriceMinor,
    currency: breakdown.currency,
    warnings: analysis.dfmIssues.filter((i) => i.level !== 'info').map((i) => i.message),
  }
}
