import { marketBudget, marketsFor } from '#services/pricing/maker_market'
import { roundUnitMinor, type BrowseTerms } from '#services/pricing/pricing_region_service'
import CatalogProduct from '#models/catalog_product'
import { calculatePrice, estimateGrams, estimatePrintMinutes } from '#services/pricing/price_engine'
import { referencePriceFor } from '#services/pricing/reference_prices'
import ShippingService from '#services/shipping/shipping_service'
import { bboxOf } from '#services/shipping/shipping_table'

export interface MarginOption {
  material: string
  buyerPriceMinor: number
  /** what the seller keeps per unit sold */
  sellerEarnsMinor: number
  /** production, shipping and the platform fee together */
  costMinor: number
}

const MAX_MARGIN_BPS = 20_000

/**
 * What a margin means in money, per material, using the same price engine and rules as the shop:
 * `terms` is the pricing region it is shown for (P2); without it, delivery in Türkiye.
 */
export default class MarginPreviewService {
  async preview(
    catalogProductId: string,
    marginBps: number,
    terms?: BrowseTerms,
    viewerId: string | null = null
  ): Promise<MarginOption[]> {
    if (!Number.isInteger(marginBps) || marginBps < 0 || marginBps > MAX_MARGIN_BPS) return []
    const product = await CatalogProduct.query()
      .where('id', catalogProductId)
      .where('isActive', true)
      // the platform catalogue, or the viewer's own design (W1)
      .where((q) => {
        q.whereNull('ownerUserId')
        if (viewerId) q.orWhere('ownerUserId', viewerId)
      })
      .preload('modelFile')
      .first()
    const file = product?.modelFile
    if (!product || !file || !file.volumeMm3 || file.analysisStatus !== 'done') return []

    const shipping = await new ShippingService().table()
    const markets = await marketsFor(terms?.country ?? 'TR', product.allowedMaterials)
    const options: MarginOption[] = []
    for (const raw of product.allowedMaterials) {
      const material = raw.toUpperCase()
      const reference = terms
        ? terms.referenceFor(material)
        : (referencePriceFor(material)?.pricePerGramMinor ?? null)
      if (reference === null) continue
      const base = {
        volumeMm3: file.volumeMm3,
        material,
        pricePerGramMinor: reference,
        quantity: 1,
        sellerMarginBps: marginBps,
        commissionBps: terms?.commissionBps,
        shippingMinor: shipping.perUnitMinor({
          country: terms?.country ?? 'TR',
          gramsPerUnit: estimateGrams(file.volumeMm3, material),
          bboxMm: bboxOf(file),
          quantity: 1,
        }),
      }
      // the maker share the shop and the order will use (Paket V: the makers' market)
      const grams = estimateGrams(file.volumeMm3, material)
      const share = marketBudget({
        market: markets.get(material) ?? [],
        lines: [
          {
            material,
            grams: Math.ceil(grams),
            minutes: estimatePrintMinutes(grams),
            finishingMinor: 0,
          },
        ],
        referenceShareMinor: calculatePrice(base).manufacturerShareMinor,
        referencePerGram: new Map([[material, reference]]),
        delivery: { city: null, country: terms?.country ?? 'TR' },
      }).budgetMinor
      const breakdown = calculatePrice({ ...base, manufacturerShareMinor: share })
      // the region's rounding lifts the buyer price; the surplus is platform fee, not the seller's
      const buyerPriceMinor = roundUnitMinor(breakdown.unitPriceMinor, terms?.rounding ?? 'none')
      options.push({
        material,
        buyerPriceMinor,
        sellerEarnsMinor: breakdown.sellerMarginMinor,
        costMinor: buyerPriceMinor - breakdown.sellerMarginMinor,
      })
    }
    return options
  }
}
