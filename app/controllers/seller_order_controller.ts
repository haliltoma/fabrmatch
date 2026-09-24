import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import OrderService from '#services/orders/order_service'
import OrderTransformer from '#transformers/order_transformer'
import { sellerOrdersQueryValidator } from '#validators/order'

export default class SellerOrderController {
  async index({ inertia, auth, request }: HttpContext) {
    const { page, status } = await request.validateUsing(sellerOrdersQueryValidator)
    const { rows, meta } = await new OrderService().listForSeller(auth.getUserOrFail().id, {
      page,
      status,
    })
    return inertia.render('seller/orders/index', {
      meta,
      status: status ?? '',
      orders: await OrderTransformer.transform(rows)
        .useVariant('forSeller')
        .resolve(app.container.createResolver(), 0),
    })
  }
}
