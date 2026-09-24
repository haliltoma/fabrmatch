import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import Order from '#models/order'
import SellerProfile from '#models/seller_profile'
import OrderService from '#services/orders/order_service'
import SellerProductService from '#services/catalog/seller_product_service'
import OrderTransformer from '#transformers/order_transformer'
import SellerProductTransformer from '#transformers/seller_product_transformer'
import { sellerOrdersQueryValidator } from '#validators/order'

/** Read-only public API for sellers (`/api/v1`). Same identity-free views as the seller panel. */
export default class ApiController {
  async orders({ apiUser, request, response }: HttpContext) {
    const { page, status } = await request.validateUsing(sellerOrdersQueryValidator)
    const { rows, meta } = await new OrderService().listForSeller(apiUser.id, { page, status })
    return response.json({
      data: await OrderTransformer.transform(rows)
        .useVariant('forSeller')
        .resolve(app.container.createResolver(), 0),
      meta,
    })
  }

  async order({ apiUser, params, response }: HttpContext) {
    const order = await Order.query()
      .where('id', params.id)
      .where('sellerId', apiUser.id)
      .whereNot('status', 'draft')
      .preload('items')
      .first()
    if (!order)
      return response.notFound({ error: { code: 'not_found', message: 'Order not found' } })
    return response.json({
      data: await OrderTransformer.transform(order)
        .useVariant('forSeller')
        .resolve(app.container.createResolver(), 0),
    })
  }

  async products({ apiUser, response }: HttpContext) {
    const profile = await SellerProfile.query().where('userId', apiUser.id).first()
    const products = profile ? await new SellerProductService().listForProfile(profile.id) : []
    return response.json({
      data: await SellerProductTransformer.transform(products).resolve(
        app.container.createResolver(),
        0
      ),
    })
  }
}
