import DeliverWebhookEvent from '#jobs/deliver_webhook_event'
import { dueWebhookEventIds } from '#services/webhook_delivery'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'

interface SweepDueWebhooksPayload {}

/** Zamanlanmış (start/scheduler.ts): `next_attempt_at` zamanı gelmiş webhook'ları tekrar dener. */
export default class SweepDueWebhooks extends Job<SweepDueWebhooksPayload> {
  static options: JobOptions = { queue: 'default', maxRetries: 0 }

  async execute() {
    for (const eventId of await dueWebhookEventIds()) {
      await DeliverWebhookEvent.dispatch({ eventId })
    }
  }
}
