import type { HttpContext } from '@adonisjs/core/http'
import TestCheckoutService, { TEST_CARD } from '#services/payments/test_checkout_service'
import { testCardValidator } from '#validators/test_checkout'

/**
 * The fake provider's hosted payment page (local only): pay with the test card and land back on
 * the order, like the real provider's return URL.
 */
export default class TestCheckoutController {
  async show({ params, auth, inertia, response }: HttpContext) {
    if (!TestCheckoutService.enabled()) return response.notFound()
    const { payment, reference, returnUrl } = await new TestCheckoutService().find(
      params.ref,
      auth.getUserOrFail().id
    )
    return inertia.render('dev/checkout', {
      providerRef: payment.providerRef,
      returnUrl,
      purpose: payment.walletUserId ? ('top_up' as const) : ('order' as const),
      orderCode: reference,
      amount: { minor: payment.amountMinor, currency: payment.currency },
      finished: payment.status !== 'pending',
      testCard: TEST_CARD,
    })
  }

  async pay({ params, auth, request, response, session }: HttpContext) {
    if (!TestCheckoutService.enabled()) return response.notFound()
    const card = await request.validateUsing(testCardValidator)
    const result = await new TestCheckoutService().charge(params.ref, auth.getUserOrFail().id, card)
    const topUp = result.returnUrl === '/seller/wallet'
    if (result.status === 'succeeded') {
      session.flash(
        'success',
        topUp ? 'Balance topped up.' : 'Payment received. We are finding a maker for your order.'
      )
    } else {
      session.flash('error', 'Card declined. Locally only the test card is accepted.')
    }
    return response.redirect().toPath(result.returnUrl)
  }
}
