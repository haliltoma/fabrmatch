import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import PaymentService from '#services/payments/payment_service'

/**
 * Hosted checkouts whose buyer closed the tab before returning: looked up at the provider and
 * applied through the idempotent payment path (iyzico; a no-op for the fake provider).
 */
export default class SyncPendingPayments extends Job<Record<string, never>> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 1,
  }

  async execute() {
    await new PaymentService().syncPending()
  }
}
