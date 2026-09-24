import CatalogProduct from '#models/catalog_product'
import { calculatePrice, estimateGrams } from '#services/pricing/price_engine'
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

/** What a margin means in money, per material, using the same price engine as the shop (delivery in Türkiye). */
export default class MarginPreviewService {
  async preview(catalogProductId: number, marginBps: number): Promise<MarginOption[]> {
    if (!Number.isInteger(marginBps) || marginBps < 0 || marginBps > MAX_MARGIN_BPS) return []
    const product = await CatalogProduct.query()
      .where('id', catalogProductId)
      .where('isActive', true)
      .preload('modelFile')
      .first()
    const file = product?.modelFile
    if (!product || !file || !file.volumeMm3 || file.analysisStatus !== 'done') return []

    const shipping = await new ShippingService().table()
    const options: MarginOption[] = []
    for (const raw of product.allowedMaterials) {
      const material = raw.toUpperCase()
      const reference = referencePriceFor(material)
      if (!reference) continue
      const breakdown = calculatePrice({
        volumeMm3: file.volumeMm3,
        material,
        pricePerGramMinor: reference.pricePerGramMinor,
        quantity: 1,
        sellerMarginBps: marginBps,
        shippingMinor: shipping.perUnitMinor({
          country: 'TR',
          gramsPerUnit: estimateGrams(file.volumeMm3, material),
          bboxMm: bboxOf(file),
          quantity: 1,
        }),
      })
      options.push({
        material,
        buyerPriceMinor: breakdown.unitPriceMinor,
        sellerEarnsMinor: breakdown.sellerMarginMinor,
        costMinor: breakdown.unitPriceMinor - breakdown.sellerMarginMinor,
      })
    }
    return options
  }
}
