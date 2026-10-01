import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import OrderHealthService from '#services/admin/order_health_service'
import MatchingService from '#services/matching/matching_service'

const listValidator = vine.create({
  q: vine.string().trim().maxLength(40).optional(),
  status: vine.string().trim().maxLength(24).optional(),
  page: vine.number().withoutDecimals().min(1).optional(),
})

const reassignValidator = vine.create({
  reason: vine.string().trim().minLength(3).maxLength(300),
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
    const health = await new OrderHealthService().show(params.id)
    if (!health) return response.notFound()
    return inertia.render('admin/orders/show', health)
  }

  /** Take a stuck job away from its maker and send the order back to matching (review fix 5). */
  async reassign({ params, request, response, session, auth }: HttpContext) {
    const { reason } = await request.validateUsing(reassignValidator)
    await new MatchingService().reassign(params.id, auth.getUserOrFail().id, reason)
    session.flash(
      'success',
      'The order is back in matching; the previous maker will not be offered it again.'
    )
    return response.redirect().toPath(`/admin/orders/${params.id}`)
  }
}
