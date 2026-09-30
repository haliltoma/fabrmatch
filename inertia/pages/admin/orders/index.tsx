import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { adminNav } from '~/lib/nav'
import { formatDateTime } from '~/lib/format'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Money } from '~/components/money'
import { OrderCode } from '~/components/order_code'
import { PageHeader } from '~/components/page_header'
import { Pagination, type PageMeta } from '~/components/pagination'
import { StatusBadge } from '~/components/status_badge'
import { useT } from '~/lib/i18n'

type Row = {
  id: number
  code: string
  status: string
  channel: string
  totalMinor: number
  currency: string
  createdAt: string | null
}

/** Status chips in the order an admin cares about: stuck and disputed first, finished last. */
const STATUS_ORDER = [
  'disputed',
  'unmatched',
  'matching',
  'paid',
  'in_production',
  'shipped',
  'delivered',
  'awaiting_payment',
  'completed',
  'resolved',
  'cancelled',
  'draft',
]

export default function AdminOrders({
  rows,
  meta,
  filters,
  statusCounts,
}: {
  rows: Row[]
  meta: PageMeta
  filters: { q: string; status: string }
  statusCounts: Record<string, number>
}) {
  const { t } = useT()
  const total = Object.values(statusCounts).reduce((a, b) => a + b, 0)
  const chips = STATUS_ORDER.filter((s) => (statusCounts[s] ?? 0) > 0)
  const pick = (status: string) =>
    router.get('/admin/orders', {
      ...(filters.q ? { q: filters.q } : {}),
      ...(status ? { status } : {}),
    })

  const [f, setF] = useState(filters)
  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Orders')}
        description={t('Find an order by code and open its full health view.')}
      />
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          router.get(
            '/admin/orders',
            Object.fromEntries(Object.entries(f).filter(([, v]) => v !== ''))
          )
        }}
      >
        <Input
          aria-label={t('Order code')}
          placeholder={t('FO-…')}
          className="w-56"
          value={f.q}
          onChange={(e) => setF({ ...f, q: e.target.value })}
        />
        <Button type="submit">{t('Search')}</Button>
      </form>
      <div className="flex flex-wrap gap-2" role="group" aria-label={t('Filter by status')}>
        {[
          { key: '', label: t('All'), count: total },
          ...chips.map((c) => ({
            key: c,
            label: t(c.replaceAll('_', ' ')),
            count: statusCounts[c],
          })),
        ].map((chip) => (
          <button
            key={chip.key || 'all'}
            type="button"
            aria-pressed={filters.status === chip.key}
            onClick={() => pick(chip.key)}
            className={`inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full border-2 px-3 text-sm font-semibold capitalize focus-visible:ring-2 focus-visible:ring-heat-500 focus-visible:ring-offset-2 focus-visible:outline-none ${
              filters.status === chip.key
                ? 'border-ink-900 bg-ink-900 text-paper'
                : 'border-line bg-paper-raised text-ink-800 hover:border-ink-900'
            }`}
          >
            {chip.label}
            <span className="font-mono text-xs tabular-nums opacity-70">{chip.count}</span>
          </button>
        ))}
      </div>
      <ul className="divide-y divide-line rounded-lg border border-line bg-paper-raised">
        {rows.map((o) => (
          <li key={o.id}>
            <Link
              href={`/admin/orders/${o.id}`}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 hover:bg-paper-sunken"
            >
              <div>
                <OrderCode code={o.code} />
                <p className="text-xs text-ink-600">
                  {formatDateTime(o.createdAt)} · {o.channel}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Money minor={o.totalMinor} currency={o.currency} className="text-sm" />
                <StatusBadge status={o.status} />
              </div>
            </Link>
          </li>
        ))}
        {rows.length === 0 && <li className="p-6 text-ink-600">{t('No orders match.')}</li>}
      </ul>
      <Pagination meta={meta} />
    </div>
  )
}

AdminOrders.layout = 'dashboard'
AdminOrders.dashboardProps = { navItems: adminNav, title: 'Admin' }
