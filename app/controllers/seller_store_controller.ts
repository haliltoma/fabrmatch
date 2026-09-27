import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import vine from '@vinejs/vine'
import ModelFile from '#models/model_file'
import SellerProduct from '#models/seller_product'
import type EtsyAdapter from '#services/integrations/stores/etsy_adapter'
import { etsyConfigured } from '#services/integrations/stores/etsy_adapter'
import { storeAdapter } from '#services/integrations/stores/store_registry'
import EtsyOAuthService, { type PkceState } from '#services/integrations/stores/etsy_oauth_service'
import StoreService from '#services/integrations/stores/store_service'
import { SHOPIFY_SCOPES } from '#services/integrations/stores/shopify_adapter'
import ShippingService from '#services/shipping/shipping_service'
import { unitPriceFor } from '#services/storefront/storefront_service'
import {
  ExternalListingTransformer,
  ExternalOrderTransformer,
  StoreConnectionTransformer,
} from '#transformers/store_transformer'

const listValidator = vine.create({
  shop: vine.number().withoutDecimals().positive().optional(),
})

const connectValidator = vine.create({
  provider: vine.enum(['shopify', 'woocommerce'] as const),
  shopUrl: vine.string().trim().minLength(3).maxLength(300),
  apiKey: vine.string().trim().maxLength(300).optional(),
  apiSecret: vine.string().trim().minLength(8).maxLength(300),
  accessToken: vine.string().trim().maxLength(300).optional(),
})

const publishValidator = vine.create({
  sellerProductId: vine.number().withoutDecimals().positive(),
  categoryId: vine
    .string()
    .trim()
    .regex(/^\d{1,12}$/)
    .optional(),
  variants: vine
    .array(
      vine.object({
        material: vine.string().trim().maxLength(20),
        priceMinor: vine.number().withoutDecimals().min(100).max(100_000_000),
      })
    )
    .minLength(1)
    .maxLength(20),
})

const unpublishValidator = vine.create({
  sellerProductId: vine.number().withoutDecimals().positive(),
})

const mapValidator = vine.create({
  sellerProductId: vine.number().withoutDecimals().positive().nullable(),
  material: vine.string().trim().maxLength(20).nullable().optional(),
  color: vine.string().trim().maxLength(40).nullable().optional(),
  scalePercent: vine.number().withoutDecimals().min(10).max(1000).nullable().optional(),
})

/** Etsy's category tree changes rarely; one copy per process for a day. */
let categoryCache: { at: number; list: Array<{ id: number; path: string }> } | null = null
async function etsyCategories() {
  if (!categoryCache || Date.now() - categoryCache.at > 24 * 3600_000) {
    categoryCache = {
      at: Date.now(),
      list: await (storeAdapter('etsy') as EtsyAdapter).categories(),
    }
  }
  return categoryCache.list
}

/** /seller/stores: the seller's own shops (R4-T3 mapping, imported orders, R4-T4 write-back). */
export default class SellerStoreController {
  private stores = new StoreService()

  async index({ inertia, auth, request }: HttpContext) {
    const seller = auth.getUserOrFail()
    const { shop } = await request.validateUsing(listValidator)
    const connections = await this.stores.connections(seller)
    const current = connections.find((c) => c.id === shop) ?? connections[0] ?? null
    const resolver = app.container.createResolver()
    const products = await SellerProduct.query()
      .whereHas('sellerProfile', (q) => q.where('userId', seller.id))
      .whereNot('status', 'archived')
      .preload('catalogProduct')
      .orderBy('title', 'asc')
    const files = await ModelFile.query().whereIn(
      'id',
      products.map((p) => p.catalogProduct?.modelFileId).filter((id): id is number => !!id)
    )
    const fileOf = new Map(files.map((f) => [f.id, f]))
    const shipping = await new ShippingService().table()
    /** What one piece costs the seller (no margin, delivery in Türkiye) and a suggested shop price. */
    const pricesFor = (product: SellerProduct) => {
      const file = fileOf.get(product.catalogProduct?.modelFileId ?? 0)
      if (!file) return []
      const atCost = Object.create(product, { marginBps: { value: 0 } }) as SellerProduct
      return product.catalogProduct.allowedMaterials.flatMap((material) => {
        const cost = unitPriceFor(atCost, file, material.toUpperCase(), shipping)
        const suggested = unitPriceFor(product, file, material.toUpperCase(), shipping)
        return cost === null || suggested === null
          ? []
          : [{ material: material.toUpperCase(), costMinor: cost, suggestedMinor: suggested }]
      })
    }
    return inertia.render('seller/stores', {
      testShops: app.inDev || app.inTest,
      shopifyScopes: SHOPIFY_SCOPES,
      etsyAvailable: etsyConfigured(),
      callbackUrl: current ? this.stores.callbackUrl(current) : null,
      currency: current?.currency ?? null,
      connections: await StoreConnectionTransformer.transform(connections).resolve(resolver, 0),
      currentId: current?.id ?? null,
      listings: current
        ? await ExternalListingTransformer.transform(
            await this.stores.listings(seller, current.id)
          ).resolve(resolver, 0)
        : [],
      orders: current
        ? await ExternalOrderTransformer.transform(
            await this.stores.orders(seller, current.id)
          ).resolve(resolver, 0)
        : [],
      products: products
        .filter((p) => p.catalogProduct)
        .map((p) => ({
          id: p.id,
          title: p.title,
          materials: p.catalogProduct.allowedMaterials,
          scales: p.catalogProduct.allowedScales ?? [100],
          prices: pricesFor(p),
        })),
    })
  }

  /** Seller's own credentials (Printify-style); checked live before they are stored. */
  async connect({ auth, request, response, session }: HttpContext) {
    const data = await request.validateUsing(connectValidator)
    const { connection, warning } = await this.stores.connect(auth.getUserOrFail(), {
      provider: data.provider,
      shopUrl: data.shopUrl,
      apiKey: data.apiKey ?? null,
      apiSecret: data.apiSecret,
      accessToken: data.accessToken ?? null,
    })
    if (warning) session.flash('error', warning)
    else session.flash('success', 'Shop connected. Paid orders will arrive here automatically.')
    return response.redirect().toPath(`/seller/stores?shop=${connection.id}`)
  }

  /** Puts a Fabrmatch product in the seller's shop (or updates it there). */
  async publish({ auth, params, request, response, session }: HttpContext) {
    const data = await request.validateUsing(publishValidator)
    await this.stores.publish(
      auth.getUserOrFail(),
      Number(params.id),
      data.sellerProductId,
      data.variants,
      data.categoryId ?? null
    )
    session.flash('success', 'Published to your shop.')
    return response.redirect().toPath(`/seller/stores?shop=${params.id}`)
  }

  /** Takes a product off sale in this shop (kept there as a draft). */
  async unpublish({ auth, params, request, response, session }: HttpContext) {
    const { sellerProductId } = await request.validateUsing(unpublishValidator)
    const { failed } = await this.stores.unpublish(
      auth.getUserOrFail(),
      sellerProductId,
      Number(params.id)
    )
    if (failed.length > 0) session.flash('error', failed.join(' '))
    else session.flash('success', 'Taken off sale in your shop.')
    return response.redirect().toPath(`/seller/stores?shop=${params.id}`)
  }

  /** "Connect with Etsy": off to Etsy's consent page, PKCE kept in the session. */
  async etsyStart({ response, session }: HttpContext) {
    const { url, pkce } = new EtsyOAuthService().start()
    session.put('etsy_pkce', pkce)
    return response.redirect(url)
  }

  async etsyCallback({ auth, request, response, session }: HttpContext) {
    const pkce = session.pull('etsy_pkce', null) as PkceState | null
    const seller = auth.getUserOrFail()
    const connection = await new EtsyOAuthService().finish(
      seller,
      request.qs() as { code?: string; state?: string; error?: string },
      pkce
    )
    await this.stores.syncListings(seller, connection.id)
    session.flash(
      'success',
      'Etsy shop connected. New paid orders are picked up every few minutes.'
    )
    return response.redirect().toPath(`/seller/stores?shop=${connection.id}`)
  }

  /** Etsy categories matching the search (for publishing). */
  async etsyCategories({ request, response }: HttpContext) {
    const q = String(request.input('q', '')).trim().toLocaleLowerCase('en')
    if (q.length < 2) return response.json({ results: [] })
    const all = await etsyCategories()
    return response.json({
      results: all.filter((c) => c.path.toLocaleLowerCase('en').includes(q)).slice(0, 20),
    })
  }

  async connectTest({ auth, response, session }: HttpContext) {
    const connection = await this.stores.connectTestShop(auth.getUserOrFail())
    session.flash('success', 'Test shop connected.')
    return response.redirect().toPath(`/seller/stores?shop=${connection.id}`)
  }

  async sync({ auth, params, response, session }: HttpContext) {
    await this.stores.syncListings(auth.getUserOrFail(), Number(params.id))
    session.flash('success', 'Products refreshed from the shop.')
    return response.redirect().toPath(`/seller/stores?shop=${params.id}`)
  }

  async disconnect({ auth, params, response, session }: HttpContext) {
    await this.stores.disconnect(auth.getUserOrFail(), Number(params.id))
    session.flash('success', 'Shop disconnected.')
    return response.redirect().toPath('/seller/stores')
  }

  async map({ auth, params, request, response, session }: HttpContext) {
    const data = await request.validateUsing(mapValidator)
    const listing = await this.stores.mapListing(auth.getUserOrFail(), Number(params.id), {
      sellerProductId: data.sellerProductId,
      material: data.material ?? null,
      color: data.color ?? null,
      scalePercent: data.scalePercent ?? null,
    })
    session.flash('success', data.sellerProductId ? 'Linked.' : 'Link removed.')
    return response.redirect().toPath(`/seller/stores?shop=${listing.storeConnectionId}`)
  }

  async retry({ auth, params, response, session }: HttpContext) {
    await this.stores.retryFulfillment(auth.getUserOrFail(), Number(params.id))
    session.flash('success', 'We will send the tracking to your shop again.')
    return response.redirect().back()
  }
}
