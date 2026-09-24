import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import { InvalidCarrierSignatureError } from '#services/shipping/carrier_provider'
import CarrierService from '#services/shipping/carrier_service'

export default class CarrierWebhookController {
  async handle({ request, response }: HttpContext) {
    const raw = request.raw()
    if (!raw) return response.badRequest({ error: 'Empty body' })
    try {
      const outcome = await new CarrierService().handleWebhook(raw, request.headers() as never)
      return response.ok({ status: outcome })
    } catch (error) {
      if (error instanceof InvalidCarrierSignatureError)
        return response.unauthorized({ error: 'Invalid signature' })
      logger.error({ msg: 'carrier webhook failed', error: (error as Error).message })
      return response.internalServerError({ error: 'Webhook processing failed' })
    }
  }
}
