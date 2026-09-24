import { router } from '@inertiajs/react'
import { adminNav } from '~/lib/nav'
import { formatDate } from '~/lib/format'
import { Money } from '~/components/money'
import { PageHeader } from '~/components/page_header'
import { StatTile } from '~/components/stat_tile'
import { useT } from '~/lib/i18n'

type Metrics = {
  days: number
  currency: string
  gmvMinor: number
  commissionMinor: number
  paidOrders: number
  completedOrders: number
  medianMatchMinutes: number | null
  offerAcceptRate: number | null
  disputeRate: number | null
  newMakerShare: number | null
  unmatchedRate: number | null
  daily: Array<{ date: string; gmvMinor: number; orders: number }>
}

const pct = (n: number | null) => (n === null ? '—' : `${(n * 100).toFixed(1)}%`)
const RANGES = [7, 30, 90]

function DailyChart({ daily, currency }: { daily: Metrics['daily']; currency: string }) {
  const { t } = useT()

  const max = Math.max(...daily.map((d) => d.gmvMinor), 1)
  const width = 640
  const height = 140
  const gap = 2
  const bar = Math.max((width - gap * (daily.length - 1)) / daily.length, 1)
  return (
    <figure className="space-y-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={t('Daily order value, last {v1} days', { v1: daily.length - 1 })}
        className="w-full"
      >
        {daily.map((d, i) => {
          const h = Math.max((d.gmvMinor / max) * (height - 4), d.gmvMinor > 0 ? 2 : 0)
          return (
            <rect
              key={d.date}
              x={i * (bar + gap)}
              y={height - h}
              width={bar}
              height={h}
              className="fill-heat-500"
              rx={1}
            >
              <title>{`${d.date}: ${(d.gmvMinor / 100).toFixed(2)} ${currency}, ${d.orders} orders`}</title>
            </rect>
          )
        })}
      </svg>
      <figcaption className="flex justify-between text-xs text-ink-600">
        <span>{formatDate(daily[0].date)}</span>
        <span>
          {t('Order value per day (peak {v2} {currency})', {
            v2: (max / 100).toFixed(2),
            currency,
          })}
        </span>
        <span>{formatDate(daily[daily.length - 1].date)}</span>
      </figcaption>
    </figure>
  )
}

export default function AdminMetrics({ metrics: m }: { metrics: Metrics }) {
  const { t } = useT()

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('Marketplace metrics')}
        description={t('Money and health of the matching loop over the selected period.')}
        action={
          <div className="flex gap-1" role="group" aria-label={t('Period')}>
            {RANGES.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={m.days === d}
                onClick={() => router.get('/admin/metrics', { days: d })}
                className={`rounded-md border px-3 py-1.5 text-sm ${
                  m.days === d ? 'border-ink-900 bg-ink-900 text-paper' : 'border-line text-ink-700'
                }`}
              >
                {t('{d} days', { d })}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label={t('Order value (GMV)')}
          value={<Money minor={m.gmvMinor} currency={m.currency} />}
          hint={`${m.paidOrders} paid orders`}
          tone="heat"
        />
        <StatTile
          label={t('Commission earned')}
          value={<Money minor={m.commissionMinor} currency={m.currency} />}
          hint={t('Platform fee ledger')}
        />
        <StatTile
          label={t('Completed')}
          value={m.completedOrders}
          hint={t('Delivered and settled')}
        />
        <StatTile
          label={t('Unmatched')}
          value={pct(m.unmatchedRate)}
          hint={t('Orders no maker took')}
          tone={m.unmatchedRate && m.unmatchedRate > 0.1 ? 'alert' : 'default'}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label={t('Median time to a maker')}
          value={m.medianMatchMinutes === null ? '—' : `${m.medianMatchMinutes} min`}
          hint={t('Payment to acceptance')}
        />
        <StatTile
          label={t('Offers accepted')}
          value={pct(m.offerAcceptRate)}
          hint={t('Of offers answered or expired')}
        />
        <StatTile
          label={t('Dispute rate')}
          value={pct(m.disputeRate)}
          hint={t('Of delivered orders')}
          tone={m.disputeRate && m.disputeRate > 0.05 ? 'alert' : 'default'}
        />
        <StatTile
          label={t('New-maker share')}
          value={pct(m.newMakerShare)}
          hint={t('Jobs won by makers under 30 days old')}
        />
      </div>

      <section className="rounded-lg border border-line bg-paper-raised p-5">
        <DailyChart daily={m.daily} currency={m.currency} />
      </section>
    </div>
  )
}

AdminMetrics.layout = 'dashboard'
AdminMetrics.dashboardProps = { navItems: adminNav, title: 'Admin' }
