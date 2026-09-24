import { router } from '@inertiajs/react'
import { LineChart } from 'lucide-react'
import { sellerNav } from '~/lib/nav'
import { EmptyState } from '~/components/empty_state'
import { MoneyList, type Amount } from '~/components/money'
import { PageHeader } from '~/components/page_header'
import { StatTile } from '~/components/stat_tile'
import { Button } from '~/components/ui/button'
import { useT } from '~/lib/i18n'

type Analytics = {
  days: number
  ordersPlaced: number
  ordersCompleted: number
  earned: Amount[]
  pending: Amount[]
  products: Array<{ title: string; units: number; earned: Amount[] }>
}

function SellerAnalytics({ analytics: a }: { analytics: Analytics }) {
  const { t } = useT()

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('Sales and earnings')}
        description={t('What your shop sold and what you have earned.')}
        action={
          <div className="flex gap-1" role="group" aria-label={t('Period')}>
            {[7, 30, 90].map((d) => (
              <Button
                key={d}
                size="sm"
                variant={a.days === d ? 'default' : 'outline'}
                aria-pressed={a.days === d}
                onClick={() => router.get('/seller/analytics', { days: d })}
              >
                {t('{d} days', { d })}
              </Button>
            ))}
            <Button asChild size="sm" variant="ghost">
              <a href="/seller/statement.csv">{t('Payouts (CSV)')}</a>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label={t('Orders')}
          value={a.ordersPlaced}
          hint={`${a.ordersCompleted} completed`}
        />
        <StatTile
          label={t('Earned')}
          value={<MoneyList amounts={a.earned} />}
          hint={t('From completed orders')}
          tone="heat"
        />
        <StatTile
          label={t('On its way')}
          value={<MoneyList amounts={a.pending} />}
          hint={t('Paid, not delivered yet')}
        />
        <StatTile
          label={t('Completion')}
          value={
            a.ordersPlaced === 0
              ? '—'
              : `${Math.round((a.ordersCompleted / a.ordersPlaced) * 100)}%`
          }
          hint={t('Of orders in this period')}
        />
      </div>

      {a.products.length === 0 ? (
        <EmptyState
          icon={LineChart}
          title={t('No sales in this period')}
          description={t('When buyers order your listed products, the best sellers appear here.')}
          action={
            <Button asChild>
              <a href="/seller/products">{t('Manage your products')}</a>
            </Button>
          }
        />
      ) : (
        <section className="space-y-2">
          <h2 className="font-display text-xl font-semibold text-ink-900">{t('Best sellers')}</h2>
          <ul className="divide-y divide-line rounded-lg border border-line bg-paper-raised">
            {a.products.map((p) => (
              <li key={p.title} className="flex items-center justify-between gap-3 px-5 py-3">
                <span className="font-medium text-ink-900">{p.title}</span>
                <span className="tabular text-sm text-ink-700">
                  {p.units} sold · <MoneyList amounts={p.earned} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

SellerAnalytics.layout = 'dashboard'
SellerAnalytics.dashboardProps = { navItems: sellerNav, title: 'Seller' }
export default SellerAnalytics
