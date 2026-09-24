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

export default function AdminOrders({
  rows,
  meta,
  filters,
}: {
  rows: Row[]
  meta: PageMeta
  filters: { q: string; status: string }
}) {
  const { t } = useT()

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
        <Input
          aria-label={t('Status')}
          placeholder={t('Status (e.g. disputed)')}
          className="w-48"
          value={f.status}
          onChange={(e) => setF({ ...f, status: e.target.value })}
        />
        <Button type="submit">{t('Search')}</Button>
      </form>
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
