import { Link } from '@adonisjs/inertia/react'
import { adminNav } from '~/lib/nav'
import { formatDateTime, formatMoney } from '~/lib/format'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent } from '~/components/ui/card'
import { Pagination, type PageMeta } from '~/components/pagination'
import { useT } from '~/lib/i18n'

type DisputeRow = {
  id: number
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">{t('Disputes')}</h1>
        <p className="text-ink-600">{t('Open cases hold the order payment until you decide')}</p>
      </div>

      {disputes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-ink-600">{t('No disputes.')}</CardContent>
        </Card>
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
                      <span className="text-xs text-ink-600">{d.resolution.replace('_', ' ')}</span>
                    )}
                    <Badge variant={STATUS_BADGES[d.status] ?? 'warning'}>{t(d.status)}</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Pagination meta={meta} />
    </div>
  )
}

AdminDisputesIndex.layout = 'dashboard'
AdminDisputesIndex.dashboardProps = { navItems: adminNav, title: 'Admin Panel' }
