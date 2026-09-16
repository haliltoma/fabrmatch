import ProductionRequest from '#models/production_request'
import { findManufacturerForUser, serializeJob } from '#services/panel/serializers'
import type { HttpContext } from '@adonisjs/core/http'

const CLOSED_STATUSES = ['delivered', 'cancelled'] as const

export default class OrdersController {
  async index({ auth, inertia, response }: HttpContext) {
    const manufacturer = await findManufacturerForUser(auth.getUserOrFail().id)
    if (!manufacturer) {
      return response.redirect().toRoute('panel.onboarding.create')
    }

    const orders = await ProductionRequest.query()
      .where('manufacturer_id', manufacturer.id)
      .whereIn('status', [...CLOSED_STATUSES])
      .orderBy('updated_at', 'desc')
      .limit(100)

    return inertia.render('panel/orders', {
      orders: orders.map(serializeJob),
      totalDelivered: orders.filter((o) => o.status === 'delivered').length,
      totalCancelled: orders.filter((o) => o.status === 'cancelled').length,
    })
  }
}
