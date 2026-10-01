import { Link } from '@adonisjs/inertia/react'
import { Hammer } from 'lucide-react'
import { makerNav } from '~/lib/nav'
import { formatDate } from '~/lib/format'
import { Button } from '~/components/ui/button'
import { EmptyState } from '~/components/empty_state'
import { MakerSetup, type Setup } from '~/components/maker_setup'
import { MoneyList, type Amount } from '~/components/money'
import { OrderCode } from '~/components/order_code'
import { PageHeader } from '~/components/page_header'
import { StatTile } from '~/components/stat_tile'
import { StatusBadge } from '~/components/status_badge'
import { useT } from '~/lib/i18n'
import { usePage } from '@inertiajs/react'
import { NextUp, type NextUpItem } from '~/components/next_up'

type RecentJob = { id: number; code: string; status: string; dueAt: string | null }

function MakerDashboard({
  pendingOffers,
  activeMachines,
  activeJobs,
  earnedThisMonth,
  setup,
  trustTier,
  alias,
  recentJobs,
}: {
  pendingOffers: number
  activeMachines: number
  activeJobs: number
  earnedThisMonth: Amount[]
  setup: Setup
  trustTier: number
  alias: string
  recentJobs: RecentJob[]
}) {
  const { t } = useT()
  const next = usePage<{ makerAttention: { items: NextUpItem[] } | null }>().props.makerAttention

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('Maker overview')}
        description={t('Working as {alias}. Offers expire fast, so check Work often.', { alias })}
        action={
          <Button variant={pendingOffers > 0 ? 'accent' : 'default'} asChild>
            <Link href="/maker/work">
              {pendingOffers === 0
                ? t('Open Work')
                : pendingOffers === 1
                  ? t('Review 1 offer')
                  : t('Review {count} offers', { count: pendingOffers })}
            </Link>
          </Button>
        }
      />

      <MakerSetup setup={setup} />

      {setup.complete && (
        <NextUp
          title={t('Next up')}
          items={next?.items ?? []}
          empty={t('Nothing waits for you right now. New offers appear here and on Work.')}
        />
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile
          label={t('Open offers')}
          value={pendingOffers}
          tone={pendingOffers > 0 ? 'heat' : 'default'}
          hint={pendingOffers > 0 ? t('Waiting for your answer') : t('Nothing pending')}
        />
        <StatTile
          label={t('Jobs in progress')}
          value={activeJobs}
          hint={t('Accepted, printing or ready')}
        />
        <StatTile
          label={t('Active machines')}
          value={activeMachines}
          hint={activeMachines === 0 ? t('Add a printer to get offers') : t('Receiving offers')}
        />
        <StatTile
          label={t('Earned this month')}
          value={<MoneyList amounts={earnedThisMonth} />}
          hint={t('Trust tier {trustTier}', { trustTier })}
        />
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold text-ink-900">{t('Latest jobs')}</h2>
        {recentJobs.length === 0 ? (
          <EmptyState
            icon={Hammer}
            title={t('No jobs yet')}
            description={
              activeMachines === 0
                ? t(
                    'You need an active printer with materials and capacity before orders can be matched to you.'
                  )
                : t(
                    'Offers that fit your machines and capacity will show up here. Accept one to start a job.'
                  )
            }
            action={
              <Button asChild>
                <Link href={activeMachines === 0 ? '/maker/printers' : '/maker/capacity'}>
                  {activeMachines === 0 ? t('Add a printer') : t('Set your capacity')}
                </Link>
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line bg-paper-raised">
            {recentJobs.map((j) => (
              <li
                key={j.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div>
                  <OrderCode code={j.code} />
                  <p className="text-xs text-ink-600">
                    {t('Due {date}', { date: formatDate(j.dueAt) })}
                  </p>
                </div>
                <StatusBadge status={j.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

MakerDashboard.layout = 'dashboard'
MakerDashboard.dashboardProps = { navItems: makerNav, title: 'Maker' }

export default MakerDashboard
