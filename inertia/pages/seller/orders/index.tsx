import { router } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { ReceiptText } from 'lucide-react'
import { sellerNav } from '~/lib/nav'
import { formatDate } from '~/lib/format'
import { Button } from '~/components/ui/button'
import { EmptyState } from '~/components/empty_state'
import { Money } from '~/components/money'
import { OrderCode } from '~/components/order_code'
import { PageHeader } from '~/components/page_header'
import { Pagination, type PageMeta } from '~/components/pagination'
import { StatusBadge } from '~/components/status_badge'
import { useT } from '~/lib/i18n'

type SaleRow = {
  id: number
  code: string
  status: string
  currency: string
  earnMinor: number
  items: Array<{ material: string; color: string | null; quantity: number }>
  createdAt: string | null
}

const FILTERS = [
  ['', 'All'],
  ['in_production', 'In production'],
  ['shipped', 'Shipped'],
  ['completed', 'Completed'],
  ['disputed', 'Disputed'],
  ['cancelled', 'Cancelled'],
] as const

function SellerOrders({
  orders,
  meta,
  status,
}: {
  orders: SaleRow[]
  meta: PageMeta
  status: string
}) {
  const { t } = useT()

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Sales')}
        description={t(
          'Orders placed on your products. You see what you earn, never who prints or buys.'
        )}
      />

      <div className="flex flex-wrap gap-2" role="group" aria-label={t('Filter by status')}>
        {FILTERS.map(([value, label]) => (
          <Button
            key={value}
            size="sm"
            variant={status === value ? 'default' : 'outline'}
            onClick={() => router.get('/seller/orders', value ? { status: value } : {})}
          >
            {t(label)}
          </Button>
        ))}
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title={status ? t('No sales with this status') : t('No sales yet')}
          description={
            status
              ? t('Try another filter.')
              : t('When a buyer orders one of your listed products it shows up here.')
          }
          action={
            status ? undefined : (
              <Button asChild>
                <Link href="/seller/products">{t('Manage your products')}</Link>
              </Button>
            )
          }
        />
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-paper-raised">
          {orders.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="space-y-0.5">
                <OrderCode code={o.code} />
                <p className="text-sm text-ink-700">
                  {o.items
                    .map((i) => `${i.material}${i.color ? ` · ${i.color}` : ''} × ${i.quantity}`)
                    .join(', ')}
                </p>
                <p className="text-xs text-ink-600">{formatDate(o.createdAt)}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-ink-700">
                  {t('You earn')}{' '}
                  <Money
                    minor={o.earnMinor}
                    currency={o.currency}
                    className="font-medium text-ink-900"
                  />
                </span>
                <StatusBadge status={o.status} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <Pagination meta={meta} />
    </div>
  )
}

SellerOrders.layout = 'dashboard'
SellerOrders.dashboardProps = { navItems: sellerNav, title: 'Seller' }

export default SellerOrders
