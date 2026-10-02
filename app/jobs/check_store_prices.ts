import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import StorePriceWatch from '#services/integrations/stores/store_price_watch'

/** Paket V (V6): once a day, every shop's prices against what production costs now. */
export default class CheckStorePrices extends Job<Record<string, never>> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 1,
  }

  async execute() {
    await new StorePriceWatch().checkAll()
  }
}
