import { calculatePrice, estimateGrams } from '#services/pricing/price_engine'
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
  async list(): Promise<UseCasePage[]> {
    const [materials, shipping] = await Promise.all([
      new MaterialPageService().list(),
      new ShippingService().table(),
    ])
    return USE_CASES.map((u) => {
      const reference = referencePriceFor(u.material)!
      const grams = estimateGrams(u.example.volumeMm3, u.material)
      const prices = u.quantities.map((quantity) => {
        const breakdown = calculatePrice({
          volumeMm3: u.example.volumeMm3,
          material: u.material,
          pricePerGramMinor: reference.pricePerGramMinor,
          quantity,
          sellerMarginBps: 0,
          shippingMinor: shipping.perUnitMinor({
            country: 'TR',
            gramsPerUnit: grams,
            bboxMm: u.example.bboxMm,
            quantity,
          }),
        })
        return {
          quantity,
          totalMinor: breakdown.totalPriceMinor,
          perPieceMinor: Math.round(breakdown.totalPriceMinor / quantity),
        }
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

  async find(slug: string): Promise<UseCasePage | null> {
    const all = await this.list()
    return all.find((u) => u.slug === slug) ?? null
  }
}
