import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import WebhookService from '#services/integrations/webhook_service'

/** Payload-less sweep: sends due seller webhooks. Idempotent — deliveries are leased before sending. */
export default class DeliverWebhooks extends Job<Record<string, never>> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 1,
  }

  async execute() {
    await new WebhookService().deliverDue()
  }
}
