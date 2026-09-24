import { Wallet } from 'lucide-react'
import { makerNav } from '~/lib/nav'
import { formatDate } from '~/lib/format'
import { EmptyState } from '~/components/empty_state'
import { Money } from '~/components/money'
import { OrderCode } from '~/components/order_code'
import { Button } from '~/components/ui/button'
import { PageHeader } from '~/components/page_header'
import { Pagination, type PageMeta } from '~/components/pagination'
import { StatTile } from '~/components/stat_tile'
import { StatusBadge } from '~/components/status_badge'
import { useT } from '~/lib/i18n'

type Total = {
  currency: string
  pendingMinor: number
  paidMinor: number
  paidThisMonthMinor: number
}
type PayoutRow = {
  id: number
  orderCode: string
  amountMinor: number
  currency: string
  status: string
  paidAt: string | null
  createdAt: string | null
}

function MakerEarnings({
  totals,
  payouts,
  meta,
}: {
  totals: Total[]
  payouts: PayoutRow[]
  meta: PageMeta
}) {
  const { t } = useT()

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('Earnings')}
        description={t(
          'Your share is released after the buyer confirms delivery and no dispute is open.'
        )}
        action={
          <Button asChild size="sm" variant="outline">
            <a href="/maker/earnings/statement.csv">{t('Download this month (CSV)')}</a>
          </Button>
        }
      />

      {totals.map((tot) => (
        <div key={tot.currency} className="grid gap-4 sm:grid-cols-3">
          <StatTile
            label={t('On its way')}
            value={<Money minor={tot.pendingMinor} currency={tot.currency} />}
            hint={t('Released, waiting for the transfer')}
          />
          <StatTile
            label={t('Paid this month')}
            value={<Money minor={tot.paidThisMonthMinor} currency={tot.currency} />}
            tone="heat"
          />
          <StatTile
            label={t('Paid in total')}
            value={<Money minor={tot.paidMinor} currency={tot.currency} />}
          />
        </div>
      ))}

      {payouts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title={t('No payouts yet')}
          description={t(
            'Once a buyer confirms delivery of a job you produced, your share shows up here.'
          )}
        />
      ) : (
        <>
          <ul className="divide-y divide-line rounded-lg border border-line bg-paper-raised">
            {payouts.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
              >
                <div>
                  <OrderCode code={p.orderCode} />
                  <p className="text-xs text-ink-600">
                    {p.paidAt
                      ? `Paid ${formatDate(p.paidAt)}`
                      : `Released ${formatDate(p.createdAt)}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Money minor={p.amountMinor} currency={p.currency} className="text-sm" />
                  <StatusBadge status={p.status} />
                </div>
              </li>
            ))}
          </ul>
          <Pagination meta={meta} />
        </>
      )}
    </div>
  )
}

MakerEarnings.layout = 'dashboard'
MakerEarnings.dashboardProps = { navItems: makerNav, title: 'Maker' }
export default MakerEarnings
