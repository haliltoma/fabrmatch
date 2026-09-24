import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import ReconciliationService from '#services/payments/reconciliation_service'

export default class ReconcilePayments extends Job<Record<string, never>> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 1,
  }

  async execute() {
    await new ReconciliationService().run()
  }
}
