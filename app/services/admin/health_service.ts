import db from '@adonisjs/lucid/services/db'
import redis from '@adonisjs/redis/services/main'
import fabrmatchConfig from '#config/fabrmatch'
import FxService from '#services/pricing/fx_service'
import QueueMonitorService from '#services/admin/queue_monitor_service'

export const QUEUE_WAITING_LIMIT = 200
export const WEBHOOK_LAG_MINUTES = 10

export interface HealthReport {
  status: 'ok' | 'degraded' | 'down'
  checks: { database: boolean; redis: boolean }
  alarms: string[]
}

/**
 * `down` = a dependency does not answer (a load balancer should pull the instance).
 * `degraded` = the app runs but something is stuck and a person should look.
 * Only alarm names are exposed, never data.
 */
export default class HealthService {
  async check(): Promise<HealthReport> {
    const checks = { database: await this.ok(() => db.rawQuery('select 1')), redis: false }
    checks.redis = await this.ok(() => redis.ping())
    if (!checks.database || !checks.redis) return { status: 'down', checks, alarms: [] }

    const alarms: string[] = []
    try {
      const overview = await new QueueMonitorService().overview()
      if (overview.queues.some((q) => q.waiting > QUEUE_WAITING_LIMIT)) alarms.push('queue_backlog')
      if (overview.failed.length > 0) alarms.push('failed_jobs')
      if (overview.schedules.some((s) => s.overdue)) alarms.push('schedule_stuck')
    } catch {
      alarms.push('queue_unreachable')
    }

    const lag = await db.rawQuery(
      `select count(*) as n from payment_webhooks
        where processed_at is null and received_at < now() - (? || ' minutes')::interval`,
      [String(WEBHOOK_LAG_MINUTES)]
    )
    if (Number(lag.rows[0].n) > 0) alarms.push('webhook_lag')

    // A switched-on currency whose rate is missing or past half its allowed age: orders in it will
    // soon be refused, so warn before that happens.
    const foreign = new FxService().enabledCurrencies().filter((c) => c !== 'TRY')
    if (foreign.length > 0) {
      const rows = await db
        .from('fx_rates')
        .whereIn('currency', foreign)
        .groupBy('currency')
        .select('currency')
        .max('created_at as newest')
      const newest = new Map(rows.map((r) => [r.currency as string, new Date(r.newest).getTime()]))
      const limit = (fabrmatchConfig.pricing.fxMaxAgeHours * 3_600_000) / 2
      if (foreign.some((c) => Date.now() - (newest.get(c) ?? 0) > limit)) alarms.push('fx_stale')
    }

    return { status: alarms.length > 0 ? 'degraded' : 'ok', checks, alarms }
  }

  private async ok(fn: () => Promise<unknown>): Promise<boolean> {
    try {
      await fn()
      return true
    } catch {
      return false
    }
  }
}
