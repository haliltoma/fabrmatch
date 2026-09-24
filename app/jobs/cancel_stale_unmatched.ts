import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import logger from '@adonisjs/core/services/logger'
import OrderService from '#services/orders/order_service'

/** Cancels + refunds orders nobody accepted within the configured window. */
export default class CancelStaleUnmatched extends Job<Record<string, never>> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 1,
  }

  async execute() {
    const cancelled = await new OrderService().autoCancelUnmatched()
    if (cancelled > 0) logger.info({ msg: 'CancelStaleUnmatched', cancelled })
  }
}
