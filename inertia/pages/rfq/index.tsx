import { Link } from '@adonisjs/inertia/react'
import { FileQuestion } from 'lucide-react'
import { sellerNav } from '~/lib/nav'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { EmptyState } from '~/components/empty_state'
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
}

export default function RfqIndex({ rfqs }: { rfqs: Rfq[] }) {
  const { t } = useT()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={t('Quote requests')}
        description={t(
          'Ask several makers for an offer on a larger job, then choose the best one.'
        )}
        action={
          <Button asChild>
            <Link href="/rfqs/new">{t('New request')}</Link>
          </Button>
        }
      />
      {rfqs.length === 0 ? (
        <EmptyState
          icon={FileQuestion}
          title={t('No requests yet')}
          description={t(
            'Upload a model, choose a quantity and a deadline, and invited makers send you their price and delivery time.'
          )}
          action={
            <Button asChild>
              <Link href="/rfqs/new">{t('Ask for offers')}</Link>
            </Button>
          }
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
                      href={`/rfqs/${r.id}`}
                      className="font-medium text-ink-900 hover:underline"
                    >
                      {r.title}
                    </Link>
                    <p className="tabular font-mono text-xs text-ink-600">
                      {r.code} · {r.material} × {r.quantity}
                    </p>
                    <p className="text-xs text-ink-600">
                      {t('Offers until {when}', { when: formatDateTime(r.bidsCloseAt) })}
                    </p>
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

RfqIndex.layout = 'dashboard'
RfqIndex.dashboardProps = { navItems: sellerNav, title: 'Seller' }
