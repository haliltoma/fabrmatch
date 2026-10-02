import { marketBudget, marketsFor } from '#services/pricing/maker_market'
import { roundUnitMinor, type BrowseTerms } from '#services/pricing/pricing_region_service'
import { calculatePrice, estimateGrams, estimatePrintMinutes } from '#services/pricing/price_engine'
import { referencePriceFor } from '#services/pricing/reference_prices'
import ShippingService from '#services/shipping/shipping_service'
import MaterialPageService, {
  MIN_MAKERS_FOR_MATERIAL_PAGE,
} from '#services/marketing/material_page_service'

/**
 * Use-case pages (M2-T3, programmatic SEO): one page per job people bring to Fabrmatch. The numbers
 * on them are real — worked out by the same price engine and shipping table as a live quote for a
 * described example part — and a page is indexed only when enough active makers print its
 * material to deliver on it; otherwise it is `noindex` (no doorway pages, marketing.md §5.2).
 */

interface UseCaseDefinition {
  slug: string
  title: string
  summary: string
  material: string
  example: { name: string; bboxMm: [number, number, number]; volumeMm3: number }
  quantities: number[]
}

export const USE_CASES: UseCaseDefinition[] = [
  {
    slug: 'prototype',
    title: 'Prototypes',
    summary: 'One part to hold in your hand before you commit to a design.',
    material: 'PLA',
    example: { name: 'Enclosure lid, 80 × 60 × 15 mm', bboxMm: [80, 60, 15], volumeMm3: 24_000 },
    quantities: [1, 2, 5],
  },
  {
    slug: 'spare-parts',
    title: 'Spare parts',
    summary: 'A broken clip, knob or bracket, printed again in a tougher material.',
    material: 'PETG',
    example: { name: 'Shelf bracket, 60 × 40 × 30 mm', bboxMm: [60, 40, 30], volumeMm3: 14_000 },
    quantities: [1, 2, 4],
  },
  {
    slug: 'small-batch',
    title: 'Small batches',
    summary: 'Ten to a hundred of the same part, without a mould or a warehouse.',
    material: 'PLA',
    example: { name: 'Cable clip, 30 × 15 × 12 mm', bboxMm: [30, 15, 12], volumeMm3: 2_500 },
    quantities: [10, 50, 100],
  },
]

export interface UseCasePage {
  slug: string
  title: string
  summary: string
  material: string
  example: { name: string; bboxMm: [number, number, number]; grams: number }
  prices: Array<{ quantity: number; totalMinor: number; perPieceMinor: number }>
  currency: string
  makers: number | null
  indexable: boolean
}

export default class UseCaseService {
  /** `terms`: the visitor's pricing region (P2); without it, delivery in Türkiye at base prices. */
  async list(terms?: BrowseTerms): Promise<UseCasePage[]> {
    const [materials, shipping, markets] = await Promise.all([
      new MaterialPageService().list(),
      new ShippingService().table(),
      marketsFor(
        terms?.country ?? 'TR',
        USE_CASES.map((u) => u.material)
      ),
    ])
    return USE_CASES.map((u) => {
      const reference = terms
        ? terms.referenceFor(u.material)!
        : referencePriceFor(u.material)!.pricePerGramMinor
      const grams = estimateGrams(u.example.volumeMm3, u.material)
      const prices = u.quantities.map((quantity) => {
        const base = {
          volumeMm3: u.example.volumeMm3,
          material: u.material,
          pricePerGramMinor: reference,
          quantity,
          sellerMarginBps: 0,
          commissionBps: terms?.commissionBps,
          shippingMinor: shipping.perUnitMinor({
            country: terms?.country ?? 'TR',
            gramsPerUnit: grams,
            bboxMm: u.example.bboxMm,
            quantity,
          }),
        }
        // priced like an order of this many pieces (Paket V: the makers' market)
        const material = u.material.toUpperCase()
        const total = marketBudget({
          market: markets.get(material) ?? [],
          lines: [
            {
              material,
              grams: Math.ceil(grams) * quantity,
              minutes: estimatePrintMinutes(grams) * quantity,
              finishingMinor: 0,
            },
          ],
          referenceShareMinor: calculatePrice(base).manufacturerShareMinor * quantity,
          referencePerGram: new Map([[material, reference]]),
          delivery: { city: null, country: terms?.country ?? 'TR' },
        }).budgetMinor
        const breakdown = calculatePrice({
          ...base,
          manufacturerShareMinor: Math.ceil(total / quantity),
        })
        const perPieceMinor = roundUnitMinor(breakdown.unitPriceMinor, terms?.rounding ?? 'none')
        return { quantity, totalMinor: perPieceMinor * quantity, perPieceMinor }
      })
      const makers = materials.find((m) => m.code === u.material)?.makers ?? null
      return {
        slug: u.slug,
        title: u.title,
        summary: u.summary,
        material: u.material,
        example: { name: u.example.name, bboxMm: u.example.bboxMm, grams },
        prices,
        currency: 'TRY',
        makers,
        indexable: (makers ?? 0) >= MIN_MAKERS_FOR_MATERIAL_PAGE,
      }
    })
  }

  async find(slug: string, terms?: BrowseTerms): Promise<UseCasePage | null> {
    const all = await this.list(terms)
    return all.find((u) => u.slug === slug) ?? null
  }
}
