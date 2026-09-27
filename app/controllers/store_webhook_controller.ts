import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import StoreService, { StoreError } from '#services/integrations/stores/store_service'
import { StoreWebhookSignatureError } from '#services/integrations/stores/store_adapter'

export default class StoreWebhookController {
  /** An order from a seller's shop. 2xx once stored (or seen before); 5xx asks the shop to retry. */
  async order({ request, response, params }: HttpContext) {
    const raw = request.raw()
    if (!raw) return response.badRequest({ error: 'Empty body' })
    try {
      const result = await new StoreService().receiveOrderWebhook(
        Number(params.id),
        raw,
        request.headers() as never
      )
      return response.ok({
        status: 'ignored' in result ? 'ignored' : result.duplicate ? 'duplicate' : 'received',
      })
    } catch (error) {
      if (error instanceof StoreWebhookSignatureError) {
        return response.unauthorized({ error: 'Invalid signature' })
      }
      if (error instanceof StoreError) return response.notFound({ error: 'Unknown shop' })
      logger.error({ msg: 'store webhook failed', error: (error as Error).message })
      return response.internalServerError({ error: 'Webhook processing failed' })
    }
  }
}
