import { BaseTransformer } from '@adonisjs/core/transformers'
import type SellerProduct from '#models/seller_product'
import type { ShopImage } from '#services/catalog/product_image_service'

export interface SellerProductCard {
  product: SellerProduct
  images: ShopImage[]
  /** The seller's shops this product is on sale in */
  shops: Array<{ connectionId: string; shopName: string; provider: string }>
}

/** A product on the seller's own products page (W1/W2): their own data, mockups and shops. */
export default class SellerProductCardTransformer extends BaseTransformer<SellerProductCard> {
  toObject() {
    const { product, images, shops } = this.resource
    const catalog = product.catalogProduct
    return {
      id: product.id,
      title: product.title,
      description: product.description,
      currency: product.currency,
      marginBps: product.marginBps,
      minMakerTier: product.minMakerTier,
      status: product.status,
      shopListed: product.shopListed,
      catalogProduct: catalog
        ? {
            id: catalog.id,
            title: catalog.title,
            ownDesign: catalog.ownerUserId !== null,
            materials: catalog.allowedMaterials,
            scales: catalog.allowedScales ?? [100],
            tags: catalog.tags ?? [],
            categoryId: catalog.categoryId,
          }
        : null,
      images: images.map((i) => ({ id: i.id, url: i.url, kind: i.kind, angle: i.angle })),
      shops,
    }
  }
}
