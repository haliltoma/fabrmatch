import { Link } from '@adonisjs/inertia/react'
import { adminNav } from '~/lib/nav'
import { formatDateTime, formatMoney } from '~/lib/format'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent } from '~/components/ui/card'
import { Pagination, type PageMeta } from '~/components/pagination'
import { useT } from '~/lib/i18n'
import { Scale } from 'lucide-react'
import { PageHeader } from '~/components/page_header'
import { EmptyState } from '~/components/empty_state'
import { RefreshingList } from '~/components/refreshing_list'

type DisputeRow = {
  id: string
  status: string
  resolution: string | null
  orderCode: string
  totalMinor: number
  currency: string
  createdAt: string | null
}

const STATUS_BADGES: Record<string, 'destructive' | 'warning' | 'success'> = {
  open: 'destructive',
  responded: 'warning',
  resolved: 'success',
}

export default function AdminDisputesIndex({
  disputes,
  meta,
}: {
  disputes: DisputeRow[]
  meta: PageMeta
}) {
  const { t } = useT()

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Disputes')}
        description={t('Open cases hold the order payment until you decide')}
      />

      <RefreshingList>
        {disputes.length === 0 ? (
          <EmptyState
            icon={Scale}
            title={t('No disputes')}
            description={t(
              'When a buyer reports a problem with a part, the case and its photos land here.'
            )}
          />
        ) : (
          <div className="space-y-3">
            {disputes.map((d) => (
              <Link key={d.id} href={`/admin/disputes/${d.id}`} className="block">
                <Card className="transition-colors hover:border-heat-500">
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                    <div>
                      <p className="font-semibold text-ink-900">{d.orderCode}</p>
                      <p className="text-xs text-ink-600">
                        {t('Opened {when}', { when: formatDateTime(d.createdAt) })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-ink-700">
                        {formatMoney(d.totalMinor, d.currency)}
                      </span>
                      {d.resolution && (
                        <span className="text-xs text-ink-600">
                          {d.resolution.replace('_', ' ')}
                        </span>
                      )}
                      <Badge variant={STATUS_BADGES[d.status] ?? 'warning'}>{t(d.status)}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </RefreshingList>

      <Pagination meta={meta} />
    </div>
  )
}

AdminDisputesIndex.layout = 'dashboard'
AdminDisputesIndex.dashboardProps = { navItems: adminNav, title: 'Admin' }
