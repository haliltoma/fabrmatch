import Color from '#models/color'
import Material from '#models/material'
import type ModelFile from '#models/model_file'
import ProductImage from '#models/product_image'
import SellerProduct from '#models/seller_product'
import type User from '#models/user'
import ProductImageService from '#services/catalog/product_image_service'
import { sizeLabel } from '#services/integrations/stores/store_service'
import { marketsFor } from '#services/pricing/maker_market'
import ShippingService from '#services/shipping/shipping_service'
import { unitPriceFor } from '#services/storefront/storefront_service'
import env from '#start/env'
import { featureEnabled } from '#services/settings/feature_flags'

export interface ApiProductView {
  product: SellerProduct
  file: ModelFile | null
  images: Array<{ url: string; kind: string; angle: number | null; color: string | null }>
  variants: Array<{
    material: string
    scalePercent: number
    size: string
    costMinor: number | null
    suggestedPriceMinor: number | null
  }>
  colours: Array<{ name: string; hex: string }>
}

/**
 * W4: what a seller's own website reads to build its catalogue: their products with every
 * material × size, what each costs them delivered in Türkiye (and a suggested price with their
 * margin), the colours they can offer and the pictures, as absolute addresses on our domain.
 */
export default class ApiCatalogService {
  async options() {
    const [materials, colours] = await Promise.all([
      Material.query().where('isActive', true).orderBy('code'),
      Color.query().where('isActive', true).orderBy('name'),
    ])
    return {
      materials: materials.map((m) => ({ code: m.code.toUpperCase(), name: m.name })),
      colours: colours.map((c) => ({ name: c.name, hex: c.hex })),
      sizes: { min: 10, max: 300, note: 'Each product lists the sizes it is offered in' },
      // abroad only once cross-border delivery is switched on (flags.crossBorder)
      deliversAbroad: featureEnabled('crossBorder'),
      currency: 'TRY',
    }
  }

  async list(seller: User) {
    const products = await this.query(seller)
    return this.views(products)
  }

  async find(seller: User, id: string) {
    const products = await this.query(seller).where('seller_products.id', id)
    const [view] = await this.views(products)
    return view ?? null
  }

  private query(seller: User) {
    return SellerProduct.query()
      .whereHas('sellerProfile', (q) => q.where('userId', seller.id))
      .whereNot('status', 'archived')
      .preload('catalogProduct', (q) => q.preload('modelFile'))
      .orderBy('createdAt', 'desc')
  }

  private async views(products: SellerProduct[]): Promise<ApiProductView[]> {
    const base = env.get('APP_URL').replace(/\/$/, '')
    const fileIds = products.flatMap((p) =>
      p.catalogProduct?.modelFileId ? [p.catalogProduct.modelFileId] : []
    )
    const [pictures, colourRows, colours, shipping, markets] = await Promise.all([
      new ProductImageService().forModelFiles(fileIds),
      fileIds.length === 0
        ? Promise.resolve([] as ProductImage[])
        : ProductImage.query()
            .whereIn('modelFileId', fileIds)
            .where('kind', 'colour_render')
            .where('status', 'approved'),
      Color.query().where('isActive', true).orderBy('name'),
      new ShippingService().table(),
      marketsFor(
        'TR',
        products.flatMap((p) => p.catalogProduct?.allowedMaterials ?? [])
      ),
    ])
    const colourName = new Map(colours.map((c) => [c.hex.toUpperCase(), c.name]))
    return products.map((product) => {
      const catalog = product.catalogProduct
      const file = catalog?.modelFile ?? null
      const atCost = Object.create(product, { marginBps: { value: 0 } }) as SellerProduct
      const variants = (catalog?.allowedMaterials ?? []).flatMap((raw) =>
        (catalog?.allowedScales ?? [100]).map((scalePercent) => {
          const material = raw.toUpperCase()
          const price = (p: SellerProduct) =>
            file
              ? unitPriceFor(p, file, material, shipping, scalePercent, 0, undefined, markets)
              : null
          return {
            material,
            scalePercent,
            size: sizeLabel(file, scalePercent),
            costMinor: price(atCost),
            suggestedPriceMinor: price(product),
          }
        })
      )
      const fileId = catalog?.modelFileId ?? ''
      const images = [
        ...(pictures.get(fileId) ?? []).map((i) => ({
          url: `${base}${i.url}`,
          kind: i.kind,
          angle: i.angle,
          color: null,
        })),
        ...colourRows
          .filter((r) => r.modelFileId === fileId)
          .map((r) => ({
            url: `${base}/images/${r.id}`,
            kind: r.kind,
            angle: r.angle,
            color: colourName.get((r.colorHex ?? '').toUpperCase()) ?? null,
          })),
      ]
      return {
        product,
        file,
        images,
        variants,
        colours: colours.map((c) => ({ name: c.name, hex: c.hex })),
      }
    })
  }
}
