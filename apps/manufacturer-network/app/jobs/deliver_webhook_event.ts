import { deliverWebhookEvent } from '#services/webhook_delivery'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'

interface DeliverWebhookEventPayload {
  eventId: number
}

/**
 * Tek gönderim denemesi. Tekrar denemeler kuyruk backoff'uyla değil, defterdeki
 * `next_attempt_at` ile yönetilir (denetlenebilir ve günlük uzlaştırmada görünür).
 */
export default class DeliverWebhookEvent extends Job<DeliverWebhookEventPayload> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 0,
  }

  async execute() {
    await deliverWebhookEvent(this.payload.eventId)
  }
}
