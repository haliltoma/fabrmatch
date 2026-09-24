import SellerProduct from '#models/seller_product'
import type SellerProfile from '#models/seller_profile'
import type CatalogProduct from '#models/catalog_product'

interface CreateSellerProductData {
  title: string
  description?: string | null
  currency?: string
  marginBps?: number
  minMakerTier?: number
}

export default class SellerProductService {
  async createFromCatalog(
    profile: SellerProfile,
    catalogProduct: CatalogProduct,
    data: { currency?: string; marginBps?: number; minMakerTier?: number }
  ): Promise<SellerProduct> {
    return SellerProduct.create({
      sellerProfileId: profile.id,
      catalogProductId: catalogProduct.id,
      title: catalogProduct.title,
      description: catalogProduct.description,
      currency: data.currency ?? 'TRY',
      marginBps: data.marginBps ?? profile.defaultMarginBps,
      minMakerTier: data.minMakerTier ?? 0,
    })
  }

  async createCustom(
    profile: SellerProfile,
    data: CreateSellerProductData
  ): Promise<SellerProduct> {
    return SellerProduct.create({
      sellerProfileId: profile.id,
      title: data.title,
      description: data.description ?? null,
      currency: data.currency ?? 'TRY',
      marginBps: data.marginBps ?? profile.defaultMarginBps,
    })
  }

  async update(
    product: SellerProduct,
    data: Partial<CreateSellerProductData>
  ): Promise<SellerProduct> {
    product.merge(data)
    await product.save()
    return product
  }

  async setStatus(product: SellerProduct, status: 'draft' | 'active' | 'archived'): Promise<void> {
    product.status = status
    await product.save()
  }

  async listForProfile(profileId: number): Promise<SellerProduct[]> {
    return SellerProduct.query()
      .where('sellerProfileId', profileId)
      .preload('catalogProduct')
      .orderBy('createdAt', 'desc')
  }

  async findForProfile(productId: number, profileId: number): Promise<SellerProduct | null> {
    return SellerProduct.query()
      .where('id', productId)
      .where('sellerProfileId', profileId)
      .preload('catalogProduct')
      .first()
  }
}
