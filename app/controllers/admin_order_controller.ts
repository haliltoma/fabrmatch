import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import OrderHealthService from '#services/admin/order_health_service'

const listValidator = vine.create({
  q: vine.string().trim().maxLength(40).optional(),
  status: vine.string().trim().maxLength(24).optional(),
  page: vine.number().withoutDecimals().min(1).optional(),
})

export default class AdminOrderController {
  async index({ inertia, request }: HttpContext) {
    const filters = await request.validateUsing(listValidator)
    const result = await new OrderHealthService().list(filters)
    return inertia.render('admin/orders/index', {
      ...result,
      filters: { q: filters.q ?? '', status: filters.status ?? '' },
    })
  }

  async show({ inertia, params, response }: HttpContext) {
    const health = await new OrderHealthService().show(Number(params.id))
    if (!health) return response.notFound()
    return inertia.render('admin/orders/show', health)
  }
}
