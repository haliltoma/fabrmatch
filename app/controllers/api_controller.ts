import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import Order, { OWN_CHANNELS } from '#models/order'
import OrderService from '#services/orders/order_service'
import OrderTransformer from '#transformers/order_transformer'
import { ApiOrderTransformer, ApiProductTransformer } from '#transformers/api_transformers'
import { sellerOrdersQueryValidator } from '#validators/order'
import { apiOrderSourceValidator, apiOrderValidator, apiQuoteValidator } from '#validators/api'
import { openApiDocument } from '#services/integrations/openapi'
import ApiCatalogService from '#services/integrations/api_catalog_service'
import ApiOrderService, { ApiInputError } from '#services/integrations/api_order_service'
import { InvalidOrderTransitionError } from '#services/orders/order_state_machine'
import { pageMeta, pageParams } from '#services/pagination'
import env from '#start/env'

const notFound = (response: HttpContext['response'], what = 'Order') =>
  response.notFound({ error: { code: 'not_found', message: `${what} not found` } })

/**
 * Public API for sellers (`/api/v1`). Reading: orders, products, catalogue options. With a
 * `read_write` key (W4) the seller's own website also quotes, orders and cancels. Same
 * identity-free views as the seller panel: never a buyer or a maker.
 */
export default class ApiController {
  async orders({ apiUser, request, response }: HttpContext) {
    const { page, status } = await request.validateUsing(sellerOrdersQueryValidator)
    const { source } = await request.validateUsing(apiOrderSourceValidator)
    if (source === 'own') {
      const { page: p, perPage } = pageParams({ page })
      const query = Order.query()
        .where('buyerId', apiUser.id)
        .whereIn('channel', [...OWN_CHANNELS])
        .preload('items')
        .orderBy('id', 'desc')
      if (status) query.where('status', status)
      const paginator = await query.paginate(p, perPage)
      return response.json({
        data: await this.orderViews(paginator.all()),
        meta: pageMeta(paginator.total, p, perPage),
      })
    }
    const { rows, meta } = await new OrderService().listForSeller(apiUser.id, { page, status })
    return response.json({
      data: await OrderTransformer.transform(rows)
        .useVariant('forSeller')
        .resolve(app.container.createResolver(), 0),
      meta,
    })
  }

  async order({ apiUser, params, response }: HttpContext) {
    const order = await new ApiOrderService().find(apiUser, params.id)
    if (!order) return notFound(response)
    const [view] = await this.orderViews([order])
    return response.json({ data: view })
  }

  async products({ apiUser, response }: HttpContext) {
    const views = await new ApiCatalogService().list(apiUser)
    return response.json({
      data: await ApiProductTransformer.transform(views).resolve(app.container.createResolver(), 0),
    })
  }

  async product({ apiUser, params, response }: HttpContext) {
    const view = await new ApiCatalogService().find(apiUser, params.id)
    if (!view) return notFound(response, 'Product')
    return response.json({
      data: await ApiProductTransformer.transform(view).resolve(app.container.createResolver(), 0),
    })
  }

  async catalogOptions({ response }: HttpContext) {
    return response.json({ data: await new ApiCatalogService().options() })
  }

  /** W4: what the lines would cost the seller (an estimate; the order is priced with the address). */
  async quote({ apiUser, request, response }: HttpContext) {
    const { lines } = await request.validateUsing(apiQuoteValidator)
    return this.refusals(response, async () =>
      response.json({ data: await new ApiOrderService().quote(apiUser, lines) })
    )
  }

  /** W4: places an order once per `externalId` (201 the first time, 200 with the same order after). */
  async createOrder({ apiUser, request, response }: HttpContext) {
    const input = await request.validateUsing(apiOrderValidator)
    return this.refusals(response, async () => {
      const { order, created } = await new ApiOrderService().create(apiUser, input)
      const [view] = await this.orderViews([order])
      return response.status(created ? 201 : 200).json({ data: view })
    })
  }

  /** W4: cancels (and refunds) an order no maker has accepted yet. */
  async cancelOrder({ apiUser, params, response }: HttpContext) {
    const service = new ApiOrderService()
    const order = await service.find(apiUser, params.id)
    if (!order || order.buyerId !== apiUser.id) return notFound(response)
    try {
      await new OrderService().cancelByBuyer(order.id, apiUser.id)
    } catch (error) {
      if (error instanceof InvalidOrderTransitionError) {
        return response.conflict({
          error: {
            code: 'not_cancellable',
            message: 'A maker is already working on this order; it can no longer be cancelled',
          },
        })
      }
      throw error
    }
    const [view] = await this.orderViews([(await service.find(apiUser, order.id))!])
    return response.json({ data: view })
  }

  /** Public: the OpenAPI 3.1 document of this API and its webhooks. */
  async openapi({ response }: HttpContext) {
    response.header('Cache-Control', 'public, max-age=3600')
    return response.json(openApiDocument(env.get('APP_URL').replace(/\/$/, '')))
  }

  private async refusals(response: HttpContext['response'], run: () => Promise<unknown>) {
    try {
      return await run()
    } catch (error) {
      if (error instanceof ApiInputError) {
        return response.status(error.status).json({
          error: { code: 'invalid_request', message: error.message, field: error.field },
        })
      }
      throw error
    }
  }

  /** Our order with the seller's own id for it and, once shipped, the tracking. */
  private async orderViews(orders: Order[]) {
    const ids = orders.map((o) => o.id)
    const external =
      ids.length === 0
        ? []
        : await db
            .from('external_orders')
            .whereIn('order_id', ids)
            .select('order_id', 'external_order_id')
    const tracking =
      ids.length === 0
        ? []
        : await db
            .from('production_jobs')
            .whereIn('order_id', ids)
            .whereNotNull('tracking_number')
            .orderBy('created_at', 'asc')
            .select('order_id', 'carrier', 'tracking_number')
    const externalOf = new Map(external.map((r) => [r.order_id, r.external_order_id as string]))
    const trackingOf = new Map(
      tracking.map((r) => [
        r.order_id,
        { carrier: r.carrier as string | null, number: r.tracking_number as string },
      ])
    )
    return ApiOrderTransformer.transform(
      orders.map((order) => ({
        order,
        externalId: externalOf.get(order.id) ?? null,
        tracking: trackingOf.get(order.id) ?? null,
      }))
    ).resolve(app.container.createResolver(), 0)
  }
}
