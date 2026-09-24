import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import Order from '#models/order'
import MessageService, { type Side } from '#services/messaging/message_service'

const sendValidator = vine.create({ body: vine.string().trim().minLength(1).maxLength(1500) })

/** Buyer door: /orders/:id/messages. The maker door is the subclass MakerOrderMessageController. */
export default class OrderMessageController {
  protected expected: Side = 'buyer'

  protected async guard(ctx: HttpContext, expected: Side) {
    const orderId = Number(ctx.params.id)
    const side = await new MessageService().sideOf(orderId, ctx.auth.getUserOrFail().id)
    if (side !== expected) return null
    return { orderId, side }
  }

  async show(ctx: HttpContext) {
    const found = await this.guard(ctx, this.expected)
    if (!found) return ctx.response.notFound()
    const order = await Order.findOrFail(found.orderId)
    return ctx.inertia.render('messages/thread', {
      side: found.side,
      order: { id: order.id, code: order.code, status: order.status },
      messages: await new MessageService().thread(found.orderId, found.side),
      backHref: found.side === 'buyer' ? `/orders/${order.id}` : '/maker/work',
      postHref:
        found.side === 'buyer'
          ? `/orders/${order.id}/messages`
          : `/maker/orders/${order.id}/messages`,
    })
  }

  async store(ctx: HttpContext) {
    const found = await this.guard(ctx, this.expected)
    if (!found) return ctx.response.notFound()
    const { body } = await ctx.request.validateUsing(sendValidator)
    const message = await new MessageService().send(
      found.orderId,
      ctx.auth.getUserOrFail().id,
      body
    )
    if (message.maskedCount > 0) {
      ctx.session.flash(
        'success',
        'Sent. Phone numbers, links and other contact details are hidden — please keep the conversation here.'
      )
    }
    return ctx.response.redirect().back()
  }
}
