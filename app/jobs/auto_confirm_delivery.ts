import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import logger from '@adonisjs/core/services/logger'
import FulfillmentService from '#services/orders/fulfillment_service'

export default class AutoConfirmDelivery extends Job<Record<string, never>> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 2,
  }

  async execute() {
    const result = await new FulfillmentService().runAutoTransitions()
    if (result.delivered || result.completed) {
      logger.info({ msg: 'AutoConfirmDelivery', ...result })
    }
  }
}
