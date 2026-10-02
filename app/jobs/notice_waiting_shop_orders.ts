import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import StorePriceWatch from '#services/integrations/stores/store_price_watch'

/** Paket V (V6): tell sellers about shop orders that still wait for a maker. */
export default class NoticeWaitingShopOrders extends Job<Record<string, never>> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 1,
  }

  async execute() {
    await new StorePriceWatch().noticeWaitingOrders()
  }
}
