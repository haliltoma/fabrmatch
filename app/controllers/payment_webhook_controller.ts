import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import PaymentService from '#services/payments/payment_service'
import { InvalidWebhookSignatureError } from '#services/payments/provider'

export default class PaymentWebhookController {
  /**
   * Success (2xx) only once the event is durably applied or recognised as a duplicate;
   * any other failure returns 5xx so the provider redelivers.
   */
  async handle({ request, response }: HttpContext) {
    const raw = request.raw()
    if (!raw) return response.badRequest({ error: 'Empty body' })

    try {
      const outcome = await new PaymentService().handleWebhook(raw, request.headers() as never)
      return response.ok({ status: outcome.status })
    } catch (error) {
      if (error instanceof InvalidWebhookSignatureError) {
        return response.unauthorized({ error: 'Invalid signature' })
      }
      logger.error({ msg: 'payment webhook failed', error: (error as Error).message })
      return response.internalServerError({ error: 'Webhook processing failed' })
    }
  }
}
