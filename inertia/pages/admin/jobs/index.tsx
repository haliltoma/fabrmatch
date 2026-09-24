import { router } from '@inertiajs/react'
import { adminNav } from '~/lib/nav'
import { formatDateTime } from '~/lib/format'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { PageHeader } from '~/components/page_header'
import { useT } from '~/lib/i18n'

type Props = {
  queues: Array<{ name: string; waiting: number }>
  schedules: Array<{
    id: string
    name: string
    status: string
    every: string
    runCount: number
    lastRunAt: string | null
    nextRunAt: string | null
    overdue: boolean
  }>
  failed: Array<{
    id: string
    queue: string
    name: string
    attempts: number
    error: string | null
    failedAt: string | null
  }>
}

export default function AdminJobs({ queues, schedules, failed }: Props) {
  const { t } = useT()

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('Background jobs')}
        description={t('Scheduled sweeps, waiting work and failures. Jobs are safe to run again.')}
      />

      <section className="space-y-2">
        <h2 className="font-display text-xl font-semibold text-ink-900">{t('Queues')}</h2>
        <ul className="flex flex-wrap gap-4">
          {queues.map((q) => (
            <li key={q.name} className="rounded-lg border border-line bg-paper-raised px-5 py-3">
              <p className="text-sm text-ink-600">{q.name}</p>
              <p className="tabular font-display text-3xl font-semibold text-ink-900">
                {q.waiting}
              </p>
              <p className="text-xs text-ink-600">{t('waiting')}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-ink-900">
          Failed jobs {failed.length > 0 && <Badge variant="destructive">{failed.length}</Badge>}
        </h2>
        {failed.length === 0 ? (
          <p className="rounded-lg border border-line bg-paper-raised px-5 py-3 text-sm text-ink-600">
            {t('No failed jobs in the last 7 days.')}
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line bg-paper-raised">
            {failed.map((f) => (
              <li key={f.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink-900">{f.name}</p>
                  <p className="text-xs text-ink-600">
                    {t('{when} · {attempts} attempts', {
                      when: formatDateTime(f.failedAt),
                      attempts: f.attempts,
                    })}
                  </p>
                  {f.error && (
                    <p className="mt-1 break-words font-mono text-xs text-danger">{f.error}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    router.post('/admin/jobs/run-again', { jobId: f.id, queue: f.queue })
                  }
                >
                  {t('Run again')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-xl font-semibold text-ink-900">{t('Schedules')}</h2>
        <ul className="divide-y divide-line rounded-lg border border-line bg-paper-raised">
          {schedules.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div>
                <p className="font-medium text-ink-900">
                  {s.name} {s.overdue && <Badge variant="destructive">{t('not firing')}</Badge>}
                </p>
                <p className="text-xs text-ink-600">
                  {t('every {every} · ran {runCount}× · last {when} · next {when2}', {
                    every: s.every,
                    runCount: s.runCount,
                    when: formatDateTime(s.lastRunAt),
                    when2: formatDateTime(s.nextRunAt),
                  })}
                </p>
              </div>
              <Badge variant="outline">{t(s.status)}</Badge>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

AdminJobs.layout = 'dashboard'
AdminJobs.dashboardProps = { navItems: adminNav, title: 'Admin' }
