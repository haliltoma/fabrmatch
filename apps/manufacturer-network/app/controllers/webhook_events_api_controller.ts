import OutboundWebhookEvent from '#models/outbound_webhook_event'
import ProductionRequest from '#models/production_request'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'

export default class WebhookEventsApiController {
  /** GET /api/v1/webhook-events?since=ISO — Akış 3, Sistem A'nın günlük uzlaştırma taraması */
  async index({ request, response }: HttpContext) {
    const sinceRaw = request.input('since')
    const since = sinceRaw ? DateTime.fromISO(String(sinceRaw)) : DateTime.now().minus({ hours: 26 })
    if (!since.isValid) {
      return response.unprocessableEntity({
        errors: [{ field: 'since', message: 'must be an ISO 8601 date' }],
      })
    }

    // Sadece sonuçlanmış olaylar — hâlâ tekrar deneme sırasında olan (pending) "kaybolmuş" sayılmaz
    const events = await OutboundWebhookEvent.query()
      .whereIn('state', ['delivered', 'failed'])
      .where('updated_at', '>=', since.toSQL()!)
      .preload('productionRequest', (query) => query.select('id', 'public_id'))
      .orderBy('id', 'asc')

    return {
      events: events.map((event) => ({
        event_id: event.publicId,
        production_request_id: (event.productionRequest as ProductionRequest).publicId,
        status: event.status,
        state: event.state,
        delivered_at: event.deliveredAt?.toUTC().toISO() ?? null,
      })),
    }
  }
}
