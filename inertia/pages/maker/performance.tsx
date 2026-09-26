import { Check, Circle } from 'lucide-react'
import { makerNav } from '~/lib/nav'
import { Badge } from '~/components/ui/badge'
import { PageHeader } from '~/components/page_header'
import { StatTile } from '~/components/stat_tile'
import { useT } from '~/lib/i18n'

type Requirement = {
  label: string
  current: number | null
  target: number
  unit: '' | '%' | '★'
  met: boolean
}
type Scorecard = {
  trustTier: number
  tierLocked: boolean
  completedJobs: number
  avgRating: number | null
  onTimeRate: number | null
  disputeRate: number
  offerAcceptRate: number | null
  avgAcceptMinutes: number | null
  nextTier: { tier: number; requirements: Requirement[] } | null
}

const TIER_NAMES = ['New', 'Verified', 'Trusted', 'Partner']
const TIER_ACCESS = [
  'Model files stay available for 24 hours and 2 downloads per job.',
  'Model files stay available for 72 hours and 5 downloads per job.',
  'Model files stay available while the job runs.',
  'Partner: repeat orders may keep their files cached.',
]
const percent = (n: number | null) => (n === null ? '—' : `${Math.round(n * 100)}%`)
const minutes = (n: number | null) =>
  n === null ? '—' : n < 60 ? `${n} min` : `${(n / 60).toFixed(1)} h`

function MakerPerformance({ alias, scorecard: s }: { alias: string; scorecard: Scorecard }) {
  const { t } = useT()

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('Performance')}
        description={t(
          'How {alias} is doing. These are the same numbers that rank you for new orders.',
          { alias }
        )}
        action={
          <Badge variant="accent">
            {t('Tier {trustTier} · {v4}', {
              trustTier: s.trustTier,
              v4: t(TIER_NAMES[s.trustTier]),
            })}
          </Badge>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile label={t('Delivered jobs')} value={s.completedJobs} />
        <StatTile
          label={t('Average rating')}
          value={s.avgRating === null ? '—' : s.avgRating.toFixed(1)}
          hint={s.avgRating === null ? t('No buyer rating yet') : t('Out of 5')}
        />
        <StatTile label={t('Shipped on time')} value={percent(s.onTimeRate)} />
        <StatTile
          label={t('Dispute rate')}
          value={percent(s.disputeRate)}
          tone={s.disputeRate >= 0.05 ? 'alert' : 'default'}
        />
        <StatTile label={t('Offers accepted')} value={percent(s.offerAcceptRate)} />
        <StatTile label={t('Average time to accept')} value={minutes(s.avgAcceptMinutes)} />
      </div>

      <section className="space-y-3 rounded-lg border border-line bg-paper-raised p-5">
        <h2 className="font-display text-xl font-semibold text-ink-900">
          {t('What your tier gives you')}
        </h2>
        <p className="text-ink-700">{t(TIER_ACCESS[s.trustTier])}</p>
        {s.tierLocked && (
          <p className="text-sm text-ink-600">{t('Your tier was set by the Fabrmatch team.')}</p>
        )}
      </section>

      {s.nextTier && !s.tierLocked && (
        <section className="space-y-3 rounded-lg border border-line bg-paper-raised p-5">
          <h2 className="font-display text-xl font-semibold text-ink-900">
            {t('Next: tier {tier} · {v4}', {
              tier: s.nextTier.tier,
              v4: t(TIER_NAMES[s.nextTier.tier]),
            })}
          </h2>
          <ul className="space-y-2">
            {s.nextTier.requirements.map((r) => (
              <li key={r.label} className="flex items-center gap-3 text-sm">
                {r.met ? (
                  <Check className="h-4 w-4 text-success" aria-label={t('met')} />
                ) : (
                  <Circle className="h-4 w-4 text-ink-400" aria-label={t('not yet')} />
                )}
                <span className="text-ink-900">{t(r.label)}</span>
                <span className="tabular text-ink-600">
                  {r.current === null ? '—' : `${r.current}${r.unit}`} / {r.target}
                  {r.unit}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-ink-600">{t('Tiers are recalculated every night.')}</p>
        </section>
      )}
    </div>
  )
}

MakerPerformance.layout = 'dashboard'
MakerPerformance.dashboardProps = { navItems: makerNav, title: 'Maker' }
export default MakerPerformance
