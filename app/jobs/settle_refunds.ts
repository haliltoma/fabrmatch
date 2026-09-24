import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import db from '@adonisjs/lucid/services/db'
import PaymentService from '#services/payments/payment_service'

/** Retries refunds the provider rejected earlier: any order with a positive `refund` balance. */
export default class SettleRefunds extends Job<Record<string, never>> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 1,
  }

  async execute() {
    const rows = await db
      .from('ledger_entries')
      .where('account', 'refund')
      .whereNotNull('order_id')
      .groupBy('order_id')
      .havingRaw(`sum(case when direction = 'credit' then amount_minor else -amount_minor end) > 0`)
      .select('order_id')

    const service = new PaymentService()
    for (const { order_id: orderId } of rows) await service.settleRefunds(orderId)
  }
}
