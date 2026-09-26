import { Head } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { Check, TriangleAlert } from 'lucide-react'
import { formatDateTime } from '~/lib/format'
import { useT } from '~/lib/i18n'

export default function Status({
  status,
  issues,
  checkedAt,
}: {
  status: 'ok' | 'degraded' | 'down'
  issues: string[]
  checkedAt: string
}) {
  const { t } = useT()

  const ok = status === 'ok'
  return (
    <>
      <Head title={t('System status — Fabrmatch')}>
        <meta name="robots" content="noindex" />
      </Head>
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-12">
        <h1 className="font-display text-4xl font-semibold text-ink-900">{t('System status')}</h1>
        <div
          role="status"
          className={`flex items-start gap-3 rounded-[10px] border p-5 ${
            ok
              ? 'border-fil-600 bg-fil-100 text-ink-900'
              : 'border-amber-ink/30 bg-amber-soft text-amber-ink'
          }`}
        >
          {ok ? (
            <Check className="mt-0.5 h-5 w-5" aria-hidden />
          ) : (
            <TriangleAlert className="mt-0.5 h-5 w-5" aria-hidden />
          )}
          <div>
            <p className="font-medium">
              {ok
                ? t('Everything is running normally.')
                : status === 'down'
                  ? t('We are having an outage.')
                  : t('Some things are slower than usual.')}
            </p>
            {issues.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {issues.map((i) => (
                  <li key={i}>{t(i)}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <p className="text-sm text-ink-600">
          {t('Checked {when}.', { when: formatDateTime(checkedAt) })}{' '}
          <Link href="/changelog" className="underline">
            {t('See what is new')}
          </Link>
        </p>
      </div>
    </>
  )
}
