import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import vine from '@vinejs/vine'
import SellerProduct from '#models/seller_product'
import StoreService from '#services/integrations/stores/store_service'
import {
  ExternalListingTransformer,
  ExternalOrderTransformer,
  StoreConnectionTransformer,
} from '#transformers/store_transformer'

const listValidator = vine.create({
  shop: vine.number().withoutDecimals().positive().optional(),
})

const mapValidator = vine.create({
  sellerProductId: vine.number().withoutDecimals().positive().nullable(),
  material: vine.string().trim().maxLength(20).nullable().optional(),
  color: vine.string().trim().maxLength(40).nullable().optional(),
  scalePercent: vine.number().withoutDecimals().min(10).max(1000).nullable().optional(),
})

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
    return inertia.render('seller/stores', {
      testShops: app.inDev || app.inTest,
      webhookBase: '/webhooks/stores',
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
        })),
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
