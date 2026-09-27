import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import StoreService from '#services/integrations/stores/store_service'

/** Shops that cannot notify us (Etsy): look for paid orders and cancellations. Idempotent. */
export default class PollStoreOrders extends Job<Record<string, never>> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 1,
  }

  async execute() {
    await new StoreService().pollOrders()
  }
}
