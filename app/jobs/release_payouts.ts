import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import PayoutService from '#services/payments/payout_service'

/** Payload-less sweep (idempotent) or a targeted release for one order. */
export default class ReleasePayouts extends Job<{ orderId?: number }> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 3,
  }

  async execute() {
    const service = new PayoutService()
    if (this.payload.orderId) await service.release(this.payload.orderId)
    else await service.releaseDue()
  }
}
