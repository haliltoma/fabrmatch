import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import logger from '@adonisjs/core/services/logger'
import redis from '@adonisjs/redis/services/main'
import AuditLog from '#models/audit_log'
import HealthService from '#services/admin/health_service'

const LAST_KEY = 'health:last-alarms'

export default class RunHealthCheck extends Job<Record<string, never>> {
  static options: JobOptions = { queue: 'default', maxRetries: 0 }

  /** Logs at error level (so log-based alerting fires) and writes one audit row when the alarm set changes. */
  async execute() {
    const report = await new HealthService().check()
    const now = [...report.alarms, ...(report.status === 'down' ? ['dependency_down'] : [])]
      .sort()
      .join(',')
    const before = (await redis.get(LAST_KEY)) ?? ''
    if (now === before) return
    await redis.set(LAST_KEY, now)
    if (now === '') {
      logger.info({ msg: 'health recovered' })
      return
    }
    logger.error({ msg: 'health alarm', alarms: now.split(','), status: report.status })
    await AuditLog.create({
      actorId: null,
      action: 'health.alarm',
      subjectType: 'system',
      subjectId: null,
      meta: { alarms: now.split(','), status: report.status },
    })
  }
}
