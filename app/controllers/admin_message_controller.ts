import type { HttpContext } from '@adonisjs/core/http'
import Order from '#models/order'
import MessageService from '#services/messaging/message_service'

export default class AdminMessageController {
  async show({ inertia, params, response }: HttpContext) {
    const order = await Order.find(params.id)
    if (!order) return response.notFound()
    return inertia.render('admin/messages/show', {
      order: { id: order.id, code: order.code, status: order.status },
      messages: await new MessageService().threadForAdmin(order.id),
    })
  }
}
