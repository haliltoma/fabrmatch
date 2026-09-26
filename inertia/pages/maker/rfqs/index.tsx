import { Link } from '@adonisjs/inertia/react'
import { FileQuestion } from 'lucide-react'
import { makerNav } from '~/lib/nav'
import { Card, CardContent } from '~/components/ui/card'
import { EmptyState } from '~/components/empty_state'
import { Money } from '~/components/money'
import { PageHeader } from '~/components/page_header'
import { RfqStatus } from '~/components/rfq_status'
import { formatDateTime } from '~/lib/format'
import { useT } from '~/lib/i18n'

type Rfq = {
  id: number
  code: string
  title: string
  material: string
  quantity: number
  bidsCloseAt: string
  status: string
  bid: { unitPriceMinor: number; leadDays: number; status: string } | null
}

export default function MakerRfqs({ rfqs }: { rfqs: Rfq[] }) {
  const { t } = useT()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={t('Quote requests')}
        description={t(
          'Buyers invite makers who can do the job. Send your price and delivery time before the deadline.'
        )}
      />
      {rfqs.length === 0 ? (
        <EmptyState
          icon={FileQuestion}
          title={t('No invitations yet')}
          description={t(
            'You are invited when your printers, materials and country fit a request. Keep your printers and capacity up to date.'
          )}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-line">
              {rfqs.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                >
                  <div>
                    <Link
                      href={`/maker/rfqs/${r.id}`}
                      className="font-medium text-ink-900 hover:underline"
                    >
                      {r.title}
                    </Link>
                    <p className="tabular font-mono text-xs text-ink-600">
                      {r.code} · {r.material} × {r.quantity}
                    </p>
                    <p className="text-xs text-ink-600">
                      {t('Bids until {when}', { when: formatDateTime(r.bidsCloseAt) })}
                    </p>
                    {r.bid && (
                      <p className="text-xs text-ink-700">
                        {t('Your offer:')} <Money minor={r.bid.unitPriceMinor} /> ·{' '}
                        {t('{n} days', { n: r.bid.leadDays })} · {t(r.bid.status)}
                      </p>
                    )}
                  </div>
                  <RfqStatus status={r.status} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

MakerRfqs.layout = 'dashboard'
MakerRfqs.dashboardProps = { navItems: makerNav, title: 'Maker Panel' }
