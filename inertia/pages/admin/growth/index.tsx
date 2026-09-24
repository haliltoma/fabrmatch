import { adminNav } from '~/lib/nav'
import { PageHeader } from '~/components/page_header'
import { StatTile } from '~/components/stat_tile'
import { useT } from '~/lib/i18n'

type Counts = Record<
  'landing_view' | 'waitlist_signup' | 'signup' | 'first_quote' | 'order_paid',
  number
>

const COLUMNS: Array<[keyof Counts, string]> = [
  ['landing_view', 'Landing views'],
  ['waitlist_signup', 'Waitlist'],
  ['signup', 'Sign-ups'],
  ['first_quote', 'Got a price'],
  ['order_paid', 'Paid orders'],
]

export default function AdminGrowth({
  funnel,
  leads,
  activation,
}: {
  funnel: Array<{ source: string; counts: Counts }>
  leads: Record<string, number>
  activation: {
    cohortDays: number
    targetDays: number
    makers: number
    ready: number
    readyWithinTarget: number
  }
}) {
  const { t } = useT()

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('Growth')}
        description={t(
          'Where people come from and how far they get, last 30 days. Events are anonymous: campaign labels only.'
        )}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label={t('Maker waitlist')}
          value={leads.maker ?? 0}
          hint={t('With consent on record')}
        />
        <StatTile
          label={t('Seller waitlist')}
          value={leads.seller ?? 0}
          hint={t('With consent on record')}
        />
        <StatTile
          label={t('Buyer waitlist')}
          value={leads.buyer ?? 0}
          hint={t('With consent on record')}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label={t('Approved makers')}
          value={activation.makers}
          hint={t('Joined in the last {cohortDays} days', { cohortDays: activation.cohortDays })}
        />
        <StatTile
          label={t('Ready for offers')}
          value={activation.ready}
          hint={t('Printer, material and free hours set')}
          tone={activation.makers > 0 && activation.ready === 0 ? 'heat' : 'default'}
        />
        <StatTile
          label={t('Ready within {targetDays} days', { targetDays: activation.targetDays })}
          value={activation.readyWithinTarget}
          hint={
            activation.makers === 0
              ? t('No makers in this period yet')
              : t('{pct}% of approved makers', {
                  pct: Math.round((activation.readyWithinTarget / activation.makers) * 100),
                })
          }
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-line bg-paper-raised">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-ink-600">
            <tr>
              <th className="px-4 py-3 font-medium">{t('Source')}</th>
              {COLUMNS.map(([key, label]) => (
                <th key={key} className="px-4 py-3 text-right font-medium">
                  {t(label)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {funnel.map((row) => (
              <tr key={row.source}>
                <td className="px-4 py-3 font-medium text-ink-900">{row.source}</td>
                {COLUMNS.map(([key]) => (
                  <td key={key} className="tabular px-4 py-3 text-right">
                    {row.counts[key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {funnel.length === 0 && (
          <p className="p-6 text-ink-600">
            {t('No events yet. Share a link with')} <code className="font-mono">?utm_source=…</code>{' '}
            {t('to start.')}
          </p>
        )}
      </div>
    </div>
  )
}

AdminGrowth.layout = 'dashboard'
AdminGrowth.dashboardProps = { navItems: adminNav, title: 'Admin' }
