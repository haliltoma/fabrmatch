import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import PaymentService from '#services/payments/payment_service'

export default class PaymentReturnController {
  /**
   * The hosted payment page (iyzico) POSTs the buyer back here with its token. That cross-site
   * POST carries no session cookie, so nothing here touches the session: the outcome is read
   * from the provider, applied idempotently, and the buyer lands on their order with a status.
   */
  async handle({ request, response }: HttpContext) {
    try {
      const { orderId, walletTopUp, outcome } = await new PaymentService().confirmReturn(
        request.all()
      )
      if (walletTopUp) return response.redirect(`/seller/wallet?topup=${outcome}`)
      return response.redirect(`/orders/${orderId}?payment=${outcome}`)
    } catch (error) {
      logger.error({ msg: 'payment return failed', error: (error as Error).message })
      return response.redirect('/orders?payment=error')
    }
  }
}
