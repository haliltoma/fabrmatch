import { Link } from '@adonisjs/inertia/react'
import { Package, ReceiptText } from 'lucide-react'
import { sellerNav } from '~/lib/nav'
import { formatDate } from '~/lib/format'
import { Button } from '~/components/ui/button'
import { EmptyState } from '~/components/empty_state'
import { Money, MoneyList, type Amount } from '~/components/money'
import { OrderCode } from '~/components/order_code'
import { PageHeader } from '~/components/page_header'
import { StatTile } from '~/components/stat_tile'
import { StatusBadge } from '~/components/status_badge'
import { SetupChecklist, type Setup } from '~/components/maker_setup'
import { useT } from '~/lib/i18n'

type RecentOrder = {
  id: number
  code: string
  status: string
  earnMinor: number
  currency: string
  createdAt: string | null
}

function SellerDashboard({
  ordersTotal,
  activeProducts,
  earnedThisMonth,
  profileStatus,
  recentOrders,
  setup,
}: {
  ordersTotal: number
  activeProducts: number
  earnedThisMonth: Amount[]
  profileStatus: string
  recentOrders: RecentOrder[]
  setup: Setup
}) {
  const { t } = useT()

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('Seller overview')}
        description={t('Your listed products, the orders they bring in, and what you earned.')}
        action={
          <Button asChild>
            <Link href="/seller/products">{t('Manage products')}</Link>
          </Button>
        }
      />

      <SetupChecklist
        setup={setup}
        title={t('Your road to a first sale')}
        home="/seller"
        tip={t('Customers see your brand on the parcel, never the maker who printed it.')}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label={t('Orders')} value={ordersTotal} hint={t('From your products')} />
        <StatTile
          label={t('Active products')}
          value={activeProducts}
          hint={activeProducts === 0 ? t('Nothing is for sale yet') : t('Visible in the shop')}
        />
        <StatTile
          label={t('Earned this month')}
          value={<MoneyList amounts={earnedThisMonth} />}
          hint={t('Paid out to you')}
          tone="heat"
        />
        <StatTile
          label={t('Profile')}
          value={<span className="text-2xl capitalize">{profileStatus}</span>}
          hint={profileStatus === 'active' ? t('Verified') : t('Waiting for review')}
        />
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold text-ink-900">{t('Recent orders')}</h2>
        {recentOrders.length === 0 ? (
          <EmptyState
            icon={Package}
            title={t('No orders yet')}
            description={t(
              'Orders appear here as soon as a buyer purchases one of your products. Add a product from the catalog to get listed in the shop.'
            )}
            action={
              <Button asChild>
                <Link href="/seller/products">{t('Add your first product')}</Link>
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line bg-paper-raised">
            {recentOrders.map((o) => (
              <li
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div className="flex items-center gap-3">
                  <ReceiptText className="h-5 w-5 text-ink-600" aria-hidden />
                  <div>
                    <OrderCode code={o.code} />
                    <p className="text-xs text-ink-600">{formatDate(o.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-ink-600">
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
      </section>
    </div>
  )
}

SellerDashboard.layout = 'dashboard'
SellerDashboard.dashboardProps = { navItems: sellerNav, title: 'Seller' }

export default SellerDashboard
