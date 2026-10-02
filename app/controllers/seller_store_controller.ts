import type { HttpContext } from '@adonisjs/core/http'
import { marketsFor } from '#services/pricing/maker_market'
import StorePriceWatch from '#services/integrations/stores/store_price_watch'
import app from '@adonisjs/core/services/app'
import vine from '@vinejs/vine'
import ModelFile from '#models/model_file'
import SellerProduct from '#models/seller_product'
import type EtsyAdapter from '#services/integrations/stores/etsy_adapter'
import { etsyConfigured } from '#services/integrations/stores/etsy_adapter'
import { storeAdapter } from '#services/integrations/stores/store_registry'
import EtsyOAuthService, { type PkceState } from '#services/integrations/stores/etsy_oauth_service'
import { wixConfigured, wixInstallUrl } from '#services/integrations/stores/wix_adapter'
import WixConnectService from '#services/integrations/stores/wix_connect_service'
import StoreService, {
  MAX_SHOP_VARIANTS,
  StoreError,
  sizeLabel,
} from '#services/integrations/stores/store_service'
import Color from '#models/color'
import { SHOPIFY_SCOPES } from '#services/integrations/stores/shopify_adapter'
import ShippingService from '#services/shipping/shipping_service'
import { unitPriceFor } from '#services/storefront/storefront_service'
import {
  ExternalListingTransformer,
  ExternalOrderTransformer,
  StoreConnectionTransformer,
} from '#transformers/store_transformer'

const listValidator = vine.create({
  shop: vine.string().uuid().optional(),
  // the products page's "Publish to my shop" (W2)
  product: vine.string().uuid().optional(),
})

const connectValidator = vine.create({
  provider: vine.enum(['shopify', 'woocommerce'] as const),
  shopUrl: vine.string().trim().minLength(3).maxLength(300),
  apiKey: vine.string().trim().maxLength(300).optional(),
  apiSecret: vine.string().trim().minLength(8).maxLength(300),
  accessToken: vine.string().trim().maxLength(300).optional(),
})

const publishValidator = vine.create({
  sellerProductId: vine.string().uuid(),
  categoryId: vine
    .string()
    .trim()
    .regex(/^\d{1,12}$/)
    .optional(),
  variants: vine
    .array(
      vine.object({
        material: vine.string().trim().maxLength(20),
        // W3: a colour from our list (none = no colour choice) and a size the design offers
        color: vine.string().trim().maxLength(40).nullable().optional(),
        scalePercent: vine.number().withoutDecimals().min(10).max(300).optional(),
        priceMinor: vine.number().withoutDecimals().min(100).max(100_000_000),
      })
    )
    .minLength(1)
    .maxLength(MAX_SHOP_VARIANTS),
})

const unpublishValidator = vine.create({
  sellerProductId: vine.string().uuid(),
})

const mapValidator = vine.create({
  sellerProductId: vine.string().uuid().nullable(),
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
/** V6: how a shop's prices follow production cost */
const priceModeValidator = vine.create({ mode: vine.enum(['watch', 'auto'] as const) })

export default class SellerStoreController {
  private stores = new StoreService()

  async index({ inertia, auth, request }: HttpContext) {
    const seller = auth.getUserOrFail()
    const { shop, product: preselect } = await request.validateUsing(listValidator)
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
      products.map((p) => p.catalogProduct?.modelFileId).filter((id): id is string => !!id)
    )
    const fileOf = new Map(files.map((f) => [f.id, f]))
    const shipping = await new ShippingService().table()
    // the makers' market in Türkiye: the cost here is what the seller will really pay per order
    const markets = await marketsFor(
      'TR',
      products.flatMap((p) => p.catalogProduct?.allowedMaterials ?? [])
    )
    /** What one piece costs the seller (no margin, delivery in Türkiye) and a suggested shop price. */
    const pricesFor = (product: SellerProduct) => {
      const file = fileOf.get(product.catalogProduct?.modelFileId ?? '')
      if (!file) return []
      const atCost = Object.create(product, { marginBps: { value: 0 } }) as SellerProduct
      // W3: every material at every size the design is offered in
      const scales = product.catalogProduct.allowedScales ?? [100]
      return product.catalogProduct.allowedMaterials.flatMap((raw) => {
        const material = raw.toUpperCase()
        return scales.flatMap((scalePercent) => {
          const cost = unitPriceFor(
            atCost,
            file,
            material,
            shipping,
            scalePercent,
            0,
            undefined,
            markets
          )
          const suggested = unitPriceFor(
            product,
            file,
            material,
            shipping,
            scalePercent,
            0,
            undefined,
            markets
          )
          return cost === null || suggested === null
            ? []
            : [{ material, scalePercent, costMinor: cost, suggestedMinor: suggested }]
        })
      })
    }
    const colours = await Color.query().where('isActive', true).orderBy('name', 'asc')
    return inertia.render('seller/stores', {
      preselectProductId: preselect ?? null,
      testShops: app.inDev || app.inTest,
      shopifyScopes: SHOPIFY_SCOPES,
      etsyAvailable: etsyConfigured(),
      wixAvailable: wixConfigured(),
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
          sizes: Object.fromEntries(
            (p.catalogProduct.allowedScales ?? [100]).map((scale) => [
              scale,
              sizeLabel(fileOf.get(p.catalogProduct.modelFileId ?? ''), scale),
            ])
          ),
        })),
      colours: colours.map((c) => ({ name: c.name, hex: c.hex })),
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
      params.id,
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
    const { failed } = await this.stores.unpublish(auth.getUserOrFail(), sellerProductId, params.id)
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

  /** "Add to Wix": Wix's own installer for our app; the seller picks the site there. */
  async wixStart({ response }: HttpContext) {
    if (!wixConfigured()) throw new StoreError('Wix is not set up on Fabrmatch yet')
    return response.redirect(wixInstallUrl())
  }

  /**
   * Opened from the seller's Wix dashboard (`instance`) or right after installing our app
   * (`signedInstance`), both carrying the site's app instance signed by Wix.
   */
  async wixConnect({ auth, request, response, session }: HttpContext) {
    const seller = auth.getUserOrFail()
    const signed = request.input('instance') ?? request.input('signedInstance')
    const connection = await new WixConnectService().connect(
      seller,
      typeof signed === 'string' ? signed : undefined
    )
    session.flash('success', 'Wix site connected. Paid orders will arrive here automatically.')
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
    await this.stores.syncListings(auth.getUserOrFail(), params.id)
    session.flash('success', 'Products refreshed from the shop.')
    return response.redirect().toPath(`/seller/stores?shop=${params.id}`)
  }

  /** V6: keep the shop's prices up to date by itself, or only warn. */
  async priceMode({ auth, params, request, response, session }: HttpContext) {
    const { mode } = await request.validateUsing(priceModeValidator)
    const connection = await this.stores.ownConnection(auth.getUserOrFail(), params.id)
    connection.priceMode = mode
    await connection.save()
    session.flash(
      'success',
      mode === 'auto'
        ? 'We keep this shop’s prices at cost plus your margin from now on.'
        : 'We tell you when a price in this shop gets thin; you change it.'
    )
    return response.redirect().toPath(`/seller/stores?shop=${connection.id}`)
  }

  /** V6: compare this shop's prices with today's production cost now. */
  async checkPrices({ auth, params, response, session }: HttpContext) {
    const connection = await this.stores.ownConnection(auth.getUserOrFail(), params.id)
    const { checked } = await new StorePriceWatch().check(connection)
    session.flash(
      'success',
      checked === 0 ? 'No published products to check yet.' : 'Prices checked.'
    )
    return response.redirect().toPath(`/seller/stores?shop=${connection.id}`)
  }

  async disconnect({ auth, params, response, session }: HttpContext) {
    await this.stores.disconnect(auth.getUserOrFail(), params.id)
    session.flash('success', 'Shop disconnected.')
    return response.redirect().toPath('/seller/stores')
  }

  async map({ auth, params, request, response, session }: HttpContext) {
    const data = await request.validateUsing(mapValidator)
    const listing = await this.stores.mapListing(auth.getUserOrFail(), params.id, {
      sellerProductId: data.sellerProductId,
      material: data.material ?? null,
      color: data.color ?? null,
      scalePercent: data.scalePercent ?? null,
    })
    session.flash('success', data.sellerProductId ? 'Linked.' : 'Link removed.')
    return response.redirect().toPath(`/seller/stores?shop=${listing.storeConnectionId}`)
  }

  async retry({ auth, params, response, session }: HttpContext) {
    await this.stores.retryFulfillment(auth.getUserOrFail(), params.id)
    session.flash('success', 'We will send the tracking to your shop again.')
    return response.redirect().back()
  }
}
