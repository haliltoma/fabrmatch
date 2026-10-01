import { router } from '@inertiajs/react'
import { Factory } from 'lucide-react'
import { adminNav } from '~/lib/nav'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { PageHeader } from '~/components/page_header'
import { EmptyState } from '~/components/empty_state'
import { useT } from '~/lib/i18n'

type Maker = {
  id: string
  alias: string
  email: string
  city: string | null
  country: string
  status: string
  trustTier: number
  tierLocked: boolean
  completedJobs: number
  avgRating: number | null
  disputeRate: number
  onTimeRate: number | null
}

const TIER_NAMES = ['New', 'Verified', 'Trusted', 'Partner']
const percent = (n: number | null) => (n === null ? '—' : `${Math.round(n * 100)}%`)

function TierControls({ maker }: { maker: Maker }) {
  const { t } = useT()

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label={t('Tier for {alias}', { alias: maker.alias })}
        className="h-9 rounded-md border border-line bg-paper-raised px-2 text-sm"
        value={maker.trustTier}
        onChange={(e) =>
          router.post(`/admin/makers/${maker.id}/tier`, { tier: Number(e.target.value) })
        }
      >
        {TIER_NAMES.map((name, tier) => (
          <option key={name} value={tier}>
            {tier} · {t(name)}
          </option>
        ))}
      </select>
      {maker.tierLocked && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => router.post(`/admin/makers/${maker.id}/tier/unlock`)}
        >
          {t('Back to automatic')}
        </Button>
      )}
    </div>
  )
}

export default function AdminMakers({ makers }: { makers: Maker[] }) {
  const { t } = useT()

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Makers')}
        description={t(
          'Track record and trust tier. Tiers update every night; pinning one here overrides the calculation.'
        )}
      />
      {makers.length === 0 ? (
        <EmptyState
          icon={Factory}
          title={t('No approved makers yet')}
          description={t('Makers appear here once you approve them from the work queues.')}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-paper-raised">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-ink-600">
              <tr>
                <th className="px-4 py-3 font-medium">{t('Maker')}</th>
                <th className="px-4 py-3 font-medium">{t('Status')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('Jobs')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('Rating')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('Disputes')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('On time')}</th>
                <th className="px-4 py-3 font-medium">{t('Trust tier')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {makers.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink-900">{m.alias}</p>
                    <p className="text-xs text-ink-600">
                      {m.email} · {[m.city, m.country].filter(Boolean).join(', ')}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={m.status === 'active' ? 'success' : 'destructive'}>
                      {t(m.status)}
                    </Badge>
                  </td>
                  <td className="tabular px-4 py-3 text-right">{m.completedJobs}</td>
                  <td className="tabular px-4 py-3 text-right">
                    {m.avgRating === null ? '—' : m.avgRating.toFixed(1)}
                  </td>
                  <td className="tabular px-4 py-3 text-right">{percent(m.disputeRate)}</td>
                  <td className="tabular px-4 py-3 text-right">{percent(m.onTimeRate)}</td>
                  <td className="px-4 py-3">
                    <TierControls maker={m} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

AdminMakers.layout = 'dashboard'
AdminMakers.dashboardProps = { navItems: adminNav, title: 'Admin' }
