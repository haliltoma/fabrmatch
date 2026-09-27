import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import StoreService from '#services/integrations/stores/store_service'

/** Writes tracking numbers back to sellers' external shops (R4-T4); idempotent per order. */
export default class PushStoreFulfillments extends Job<Record<string, never>> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 1,
  }

  async execute() {
    await new StoreService().pushPendingFulfillments()
  }
}
