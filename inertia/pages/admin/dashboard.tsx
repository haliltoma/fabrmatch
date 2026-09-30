import { Link } from '@adonisjs/inertia/react'
import { usePage } from '@inertiajs/react'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { adminNav } from '~/lib/nav'
import { formatDate } from '~/lib/format'
import { Button } from '~/components/ui/button'
import { Money } from '~/components/money'
import { OrderCode } from '~/components/order_code'
import { PageHeader } from '~/components/page_header'
import { StatTile } from '~/components/stat_tile'
import { StatusBadge } from '~/components/status_badge'
import { useT } from '~/lib/i18n'

type RecentOrder = {
  id: number
  code: string
  status: string
  totalMinor: number
  currency: string
  createdAt: string | null
}
type RecentUser = { id: number; name: string | null; email: string; createdAt: string | null }

function AdminDashboard({
  usersTotal,
  ordersTotal,
  openDisputes,
  platformFeeMinor,
  queues,
  recentOrders,
  recentUsers,
}: {
  usersTotal: number
  ordersTotal: number
  openDisputes: number
  platformFeeMinor: number
  queues: {
    unmatched: number
    overdue: number
    paymentReviews: number
    reconcile: number
    pendingMakers: number
    fraud: number
    reports: number
    chargebacks: number
    support: number
    shopPhotos: number
  }
  recentOrders: RecentOrder[]
  recentUsers: RecentUser[]
}) {
  const { t } = useT()
  const attention = usePage<{
    adminAttention: {
      items: Array<{ key: string; count: number; label: string; href: string }>
    } | null
  }>().props.adminAttention
  const todo = attention?.items ?? []

  const waiting = Object.values(queues).reduce((sum, n) => sum + n, 0)
  return (
    <div className="space-y-8">
      <PageHeader
        title={t('Today')}
        description={t('What needs a decision first, then how the marketplace is moving.')}
        action={
          openDisputes > 0 ? (
            <Button variant="accent" asChild>
              <Link href="/admin/disputes">
                {openDisputes > 1
                  ? t('Decide {count} open disputes', { count: openDisputes })
                  : t('Decide {count} open dispute', { count: openDisputes })}
              </Link>
            </Button>
          ) : undefined
        }
      />

      <section
        aria-labelledby="todo-h"
        className="rounded-[10px] border-2 border-ink-900 bg-paper-raised"
      >
        <div className="flex items-center justify-between border-b-2 border-ink-900 px-5 py-3">
          <h2 id="todo-h" className="font-display text-lg font-semibold text-ink-900">
            {t('Needs you now')}
          </h2>
          {todo.length > 0 && (
            <span className="font-mono text-xs text-ink-600 tabular-nums">
              {t('{count} kinds of work waiting', { count: todo.length })}
            </span>
          )}
        </div>
        {todo.length === 0 ? (
          <p className="flex items-center gap-2 px-5 py-4 text-ink-700">
            <CheckCircle2 className="h-5 w-5 text-fil-600" aria-hidden />
            {t('Nothing is waiting for a person. Everything below is for keeping an eye on.')}
          </p>
        ) : (
          <ol className="divide-y divide-line">
            {todo.map((item, i) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-paper-sunken focus-visible:bg-paper-sunken"
                >
                  <span className="w-6 font-mono text-xs text-ink-500 tabular-nums">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="min-w-10 rounded-full bg-heat-100 px-2 text-center font-mono text-sm font-semibold text-heat-700 tabular-nums">
                    {item.count}
                  </span>
                  <span className="flex-1 font-medium text-ink-900">{t(item.label)}</span>
                  <ArrowRight className="h-4 w-4 text-ink-500" aria-hidden />
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatTile label={t('Users')} value={usersTotal} hint={t('All accounts')} />
        <StatTile label={t('Orders')} value={ordersTotal} hint={t('Excluding drafts')} />
        <StatTile
          label={t('Open disputes')}
          value={openDisputes}
          tone={openDisputes > 0 ? 'alert' : 'default'}
          hint={openDisputes > 0 ? t('Payments on hold') : t('All clear')}
        />
        <StatTile
          label={t('Waiting in queues')}
          value={<Link href="/admin/queues">{waiting}</Link>}
          tone={waiting > 0 ? 'alert' : 'default'}
          hint={
            waiting > 0
              ? t('{makers} makers · {unmatched} unmatched · {late} late', {
                  makers: queues.pendingMakers,
                  unmatched: queues.unmatched,
                  late: queues.overdue,
                })
              : t('Nothing stuck')
          }
        />
        <StatTile
          label={t('Platform fees')}
          value={<Money minor={platformFeeMinor} />}
          hint={t('Earned on released orders')}
          tone="heat"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-ink-900">{t('Latest orders')}</h2>
          {recentOrders.length === 0 ? (
            <p className="rounded-lg border border-dashed border-ink-900/25 p-6 text-ink-700">
              {t('No orders have been placed yet.')}
            </p>
          ) : (
            <ul className="divide-y divide-line rounded-lg border border-line bg-paper-raised">
              {recentOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div>
                    <Link href={`/admin/orders/${o.id}`}>
                      <OrderCode code={o.code} />
                    </Link>
                    <p className="text-xs text-ink-600">{formatDate(o.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Money minor={o.totalMinor} currency={o.currency} className="text-sm" />
                    <StatusBadge status={o.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-ink-900">{t('New users')}</h2>
          <ul className="divide-y divide-line rounded-lg border border-line bg-paper-raised">
            {recentUsers.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-900">{u.name || u.email}</p>
                  <p className="truncate text-xs text-ink-600">{u.email}</p>
                </div>
                <span className="text-xs text-ink-600">{formatDate(u.createdAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

AdminDashboard.layout = 'dashboard'
AdminDashboard.dashboardProps = { navItems: adminNav, title: 'Admin' }

export default AdminDashboard
