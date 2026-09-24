import { Link } from '@adonisjs/inertia/react'
import { PackageOpen } from 'lucide-react'
import { formatDateTime } from '~/lib/format'
import { Button } from '~/components/ui/button'
import { EmptyState } from '~/components/empty_state'
import { Money } from '~/components/money'
import { OrderCode } from '~/components/order_code'
import { PageHeader } from '~/components/page_header'
import { StatusBadge } from '~/components/status_badge'
import { Pagination, type PageMeta } from '~/components/pagination'
import { useT } from '~/lib/i18n'

type OrderItem = {
  id: number
  fileName: string | null
  material: string
  color: string | null
  quantity: number
  unitCostMinor: number
}

type OrderData = {
  id: number
  code: string
  status: string
  currency: string
  totalMinor: number
  items: OrderItem[]
  createdAt: string | null
}

export default function OrdersIndex({ orders, meta }: { orders: OrderData[]; meta: PageMeta }) {
  const { t } = useT()

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader
        title={t('My orders')}
        description={t('Everything you have ordered, newest first.')}
      />

      {orders.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title={t("You haven't ordered anything yet")}
          description={t(
            'Pick a product from the shop, or upload your own model and get a price in seconds.'
          )}
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link href="/shop">{t('Browse the shop')}</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/files">{t('Upload a model')}</Link>
              </Button>
            </div>
          }
        />
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/orders/${order.id}`}
                className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-line bg-paper-raised px-5 py-4 transition-colors hover:border-ink-900/40"
              >
                <div className="space-y-1">
                  <OrderCode code={order.code} />
                  <p className="text-sm text-ink-700">
                    {order.items
                      .map((i) => `${i.material}${i.color ? ` · ${i.color}` : ''} × ${i.quantity}`)
                      .join(', ')}
                  </p>
                </div>
                <div className="flex items-center gap-5">
                  <div className="text-right">
                    <Money
                      minor={order.totalMinor}
                      currency={order.currency}
                      className="font-medium"
                    />
                    <p className="text-xs text-ink-600">{formatDateTime(order.createdAt)}</p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Pagination meta={meta} />
    </div>
  )
}
