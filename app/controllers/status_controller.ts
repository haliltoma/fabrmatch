import type { HttpContext } from '@adonisjs/core/http'
import { requestLocale } from '#services/i18n/request_locale'
import { readFile } from 'node:fs/promises'
import app from '@adonisjs/core/services/app'
import HealthService from '#services/admin/health_service'
import { renderLegalMarkdown } from '#services/legal/legal_service'

const ALARM_LABELS: Record<string, string> = {
  queue_backlog: 'Background work is running behind',
  failed_jobs: 'Some background jobs failed and are being reviewed',
  schedule_stuck: 'A scheduled task has stopped running',
  fx_stale: 'Prices in other currencies may soon be unavailable',
  webhook_lag: 'Payment confirmations are delayed',
  queue_unreachable: 'The background queue is not answering',
  dependency_down: 'A core service is not answering',
}

export default class StatusController {
  async status({ inertia }: HttpContext) {
    const report = await new HealthService().check()
    return inertia.render('status/index', {
      status: report.status,
      issues: [...(report.status === 'down' ? ['dependency_down'] : []), ...report.alarms].map(
        (a) => ALARM_LABELS[a] ?? 'Something is degraded'
      ),
      checkedAt: new Date().toISOString(),
    })
  }

  async changelog(ctx: HttpContext) {
    const { inertia } = ctx
    const file =
      requestLocale(ctx) === 'tr' ? 'resources/changelog.tr.md' : 'resources/changelog.md'
    const source = await readFile(app.makePath(file), 'utf8')
    return inertia.render('status/changelog', { html: renderLegalMarkdown(source) })
  }
}
