import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import logger from '@adonisjs/core/services/logger'
import AuditLog from '#models/audit_log'
import FulfillmentService from '#services/orders/fulfillment_service'

export default class CheckProductionSla extends Job<Record<string, never>> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 2,
  }

  async execute() {
    const { overdue, critical } = await new FulfillmentService().slaReport()
    const criticalIds = new Set(critical.map((j) => j.id))

    for (const job of overdue) {
      const action = criticalIds.has(job.id) ? 'sla.critical' : 'sla.overdue'
      const already = await AuditLog.query()
        .where('subjectType', 'order')
        .where('subjectId', job.orderId)
        .where('action', action)
        .first()
      if (already) continue

      await AuditLog.create({
        actorId: null,
        action,
        subjectType: 'order',
        subjectId: job.orderId,
        meta: { jobId: job.id, dueAt: job.dueAt.toISO() },
      })
      logger.warn({ msg: `production ${action}`, orderId: job.orderId, jobId: job.id })
    }
  }
}
