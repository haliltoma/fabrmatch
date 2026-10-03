import type { HttpContext } from '@adonisjs/core/http'
import fabrmatchConfig from '#config/fabrmatch'
import TestCheckoutService from '#services/payments/test_checkout_service'
import app from '@adonisjs/core/services/app'
import LegalService from '#services/legal/legal_service'
import OrderService from '#services/orders/order_service'
import type Order from '#models/order'
import FulfillmentService from '#services/orders/fulfillment_service'
import PaymentService, { normalizePhone } from '#services/payments/payment_service'
import WalletService from '#services/payments/wallet_service'
import DisputeService from '#services/disputes/dispute_service'
import DisputeTransformer from '#transformers/dispute_transformer'
import OrderTransformer from '#transformers/order_transformer'
import {
  createOrderValidator,
  pageQueryValidator,
  payValidator,
  reviewValidator,
} from '#validators/order'
import { allowsTestPayments, paymentProvider } from '#services/payments/provider_registry'

function payStep(order: Order, service: OrderService) {
  if (!['draft', 'awaiting_payment'].includes(order.status)) return null
  if (paymentProvider().needsBuyerIdentity !== true) return null
  const address = service.decryptShippingAddress(order)
  const country = address?.country ?? 'TR'
  // a landline or a typo on the address still gets the phone field at the pay step
  return { phoneOnFile: !!normalizePhone(address?.phone ?? '', country), country }
}

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

  async show({ inertia, auth, params, request, response }: HttpContext) {
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
      // locally the Pay button opens the test payment page (fake provider)
      testPayments: TestCheckoutService.enabled(),
      // iyzico asks for the identity number (and a phone when the address has none) at the pay step
      payStep: payStep(order, service),
      // a seller with a balance can pay their shop's orders from it
      walletBalanceMinor:
        ['draft', 'awaiting_payment'].includes(order.status) && order.currency === 'TRY'
          ? await new WalletService().balance(order.buyerId)
          : null,
      confirmDays: fabrmatchConfig.orders.autoConfirmDays,
      // set by the hosted page return: paid | failed | pending
      paymentReturn:
        (['paid', 'failed', 'pending'] as const).find(
          (outcome) => outcome === request.input('payment')
        ) ?? null,
    })
  }

  async cancel({ auth, params, response, session }: HttpContext) {
    await new OrderService().cancelByBuyer(params.id, auth.getUserOrFail().id)
    session.flash('success', 'Order cancelled.')
    return response.redirect().back()
  }

  /** Opens a provider checkout and sends the buyer to it (3DS happens at the provider). */
  async pay({ auth, params, inertia, request }: HttpContext) {
    const payer = await request.validateUsing(payValidator)
    const { redirectUrl } = await new PaymentService().startCheckout(
      params.id,
      auth.getUserOrFail().id,
      { ...payer, ip: request.ip() }
    )
    return inertia.location(redirectUrl)
  }

  /** Pays the order from the buyer's wallet balance (sellers paying their shop's orders). */
  async payFromWallet({ auth, params, response, session }: HttpContext) {
    await new PaymentService().payFromWallet(params.id, auth.getUserOrFail().id)
    session.flash('success', 'Paid from your balance — looking for a maker.')
    return response.redirect().toPath(`/orders/${params.id}`)
  }

  /** Dev-only: completes a fake-provider checkout through the real webhook path. */
  async simulatePayment({ auth, params, response, session }: HttpContext) {
    if (!allowsTestPayments()) return response.notFound()
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
