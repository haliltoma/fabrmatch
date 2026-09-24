import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import LegalService from '#services/legal/legal_service'
import OrderService from '#services/orders/order_service'
import FulfillmentService from '#services/orders/fulfillment_service'
import PaymentService from '#services/payments/payment_service'
import DisputeService from '#services/disputes/dispute_service'
import DisputeTransformer from '#transformers/dispute_transformer'
import OrderTransformer from '#transformers/order_transformer'
import { createOrderValidator, pageQueryValidator, reviewValidator } from '#validators/order'

export default class OrderController {
  async index({ inertia, auth, request }: HttpContext) {
    const { page } = await request.validateUsing(pageQueryValidator)
    const { rows, meta } = await new OrderService().listForBuyer(auth.getUserOrFail().id, { page })
    return inertia.render('orders/index', {
      orders: await OrderTransformer.transform(rows).resolve(app.container.createResolver(), 0),
      meta,
    })
  }

  async store({ request, response, auth }: HttpContext) {
    const { acceptTerms, ...data } = await request.validateUsing(createOrderValidator)
    await new LegalService().requireAcceptance(auth.getUserOrFail().id, acceptTerms)
    const order = await new OrderService().createDraft(auth.getUserOrFail(), data)
    return response.redirect().toRoute('order.show', { id: order.id })
  }

  async show({ inertia, auth, params, response }: HttpContext) {
    const service = new OrderService()
    const order = await service.findForBuyer(params.id, auth.getUserOrFail().id)
    if (!order) return response.notFound()

    const dispute = await new DisputeService().findForOrder(order.id)
    const job = order.productionJobs.find((j) => j.status !== 'cancelled')
    return inertia.render('orders/show', {
      order: await OrderTransformer.transform(order).resolve(app.container.createResolver(), 0),
      timeline: await service.timeline(order.id),
      review: job?.rating ? { rating: job.rating, comment: job.reviewComment } : null,
      dispute: dispute
        ? await DisputeTransformer.transform(dispute).resolve(app.container.createResolver(), 0)
        : null,
      evidenceUrls: dispute ? await new DisputeService().evidenceUrls(dispute.evidence) : {},
      canSimulatePayment: app.inDev,
    })
  }

  async cancel({ auth, params, response, session }: HttpContext) {
    await new OrderService().cancelByBuyer(params.id, auth.getUserOrFail().id)
    session.flash('success', 'Order cancelled.')
    return response.redirect().back()
  }

  /** Opens a provider checkout and sends the buyer to it (3DS happens at the provider). */
  async pay({ auth, params, inertia }: HttpContext) {
    const { redirectUrl } = await new PaymentService().startCheckout(
      params.id,
      auth.getUserOrFail().id
    )
    return inertia.location(redirectUrl)
  }

  /** Dev-only: completes a fake-provider checkout through the real webhook path. */
  async simulatePayment({ auth, params, response, session }: HttpContext) {
    if (!(app.inDev || app.inTest)) return response.notFound()
    await new PaymentService().simulateSuccess(params.id, auth.getUserOrFail().id)
    session.flash('success', 'Payment simulated — looking for a manufacturer.')
    return response.redirect().back()
  }

  async delivered({ auth, params, response, session }: HttpContext) {
    await new FulfillmentService().markDeliveredByBuyer(params.id, auth.getUserOrFail().id)
    session.flash('success', 'Thanks! Delivery confirmed.')
    return response.redirect().back()
  }

  async complete({ auth, params, response, session }: HttpContext) {
    await new FulfillmentService().completeByBuyer(params.id, auth.getUserOrFail().id)
    session.flash('success', 'Order completed.')
    return response.redirect().back()
  }

  async review({ request, auth, params, response, session }: HttpContext) {
    const { rating, comment } = await request.validateUsing(reviewValidator)
    await new FulfillmentService().review(
      params.id,
      auth.getUserOrFail().id,
      rating,
      comment ?? null
    )
    session.flash('success', 'Review saved.')
    return response.redirect().back()
  }
}
