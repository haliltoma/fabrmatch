import { router } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { ChevronRight, Handshake } from 'lucide-react'
import { adminNav } from '~/lib/nav'
import { formatDateTime } from '~/lib/format'
import { Button } from '~/components/ui/button'
import { EmptyState } from '~/components/empty_state'
import { Money } from '~/components/money'
import { OrderCode } from '~/components/order_code'
import { PageHeader } from '~/components/page_header'
import { useT } from '~/lib/i18n'

type Row = {
  id: string
  code: string
  state: 'needs_maker' | 'offer_out' | 'unmatched'
  totalMinor: number
  currency: string
  waitingSince: string | null
  items: { material: string; quantity: number }[]
  offersTried: number
  pendingOffer: { maker: string | null; expiresAt: string | null } | null
}

const SECTIONS: { state: Row['state']; title: string; hint: string }[] = [
  {
    state: 'needs_maker',
    title: 'Needs a maker',
    hint: 'Paid and waiting for you to pick who prints it.',
  },
  {
    state: 'unmatched',
    title: 'Unmatched',
    hint: 'Nobody took it. Pick a maker to reopen it, or it is refunded automatically.',
  },
  {
    state: 'offer_out',
    title: 'Offer sent',
    hint: 'Waiting for the maker to accept. If they decline or time runs out it comes back here.',
  },
]

function ModeSwitch({ autoOffer }: { autoOffer: boolean }) {
  const { t } = useT()
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-line bg-paper-raised px-5 py-4">
      <div>
        <p className="font-medium text-ink-900">
          {t('Matching mode')}:{' '}
          <span className={autoOffer ? 'text-fil-600' : 'text-heat-700'}>
            {autoOffer ? t('Automatic') : t('Manual')}
          </span>
        </p>
        <p className="text-sm text-ink-700">
          {autoOffer
            ? t('Offers go out by score as soon as an order is paid. You can still step in here.')
            : t('Every paid order waits here until you choose the maker.')}
        </p>
      </div>
      <Button
        variant="outline"
        onClick={() => {
          const message = autoOffer
            ? t('Switch to manual? New paid orders will wait for you.')
            : t('Switch to automatic? Every waiting order gets an offer right away.')
          if (window.confirm(message)) router.post('/admin/matching/mode', { auto: !autoOffer })
        }}
      >
        {autoOffer ? t('Switch to manual') : t('Switch to automatic')}
      </Button>
    </div>
  )
}

export default function AdminMatching({
  orders,
  autoOffer,
}: {
  orders: Row[]
  autoOffer: boolean
}) {
  const { t } = useT()

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('Matching')}
        description={t(
          'Paid orders waiting for a maker. Open one to see who fits and send the offer.'
        )}
      />
      <ModeSwitch autoOffer={autoOffer} />

      {orders.length === 0 ? (
        <EmptyState
          icon={Handshake}
          title={t('Nothing is waiting')}
          description={t(
            'Paid orders that need a maker show up here the moment the payment lands.'
          )}
        />
      ) : (
        SECTIONS.map((section) => {
          const rows = orders.filter((o) => o.state === section.state)
          if (rows.length === 0) return null
          return (
            <section key={section.state} className="space-y-3">
              <div>
                <h2 className="font-display text-xl font-semibold text-ink-900">
                  {t(section.title)}{' '}
                  <span className="tabular text-base font-normal text-ink-600">{rows.length}</span>
                </h2>
                <p className="text-sm text-ink-700">{t(section.hint)}</p>
              </div>
              <ul className="divide-y divide-line rounded-lg border border-line bg-paper-raised">
                {rows.map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/admin/matching/${o.id}`}
                      className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 hover:bg-paper-sunken"
                    >
                      <div className="space-y-0.5">
                        <OrderCode code={o.code} />
                        <p className="text-xs text-ink-600">
                          {o.items.map((i) => `${i.material} × ${i.quantity}`).join(', ')} ·{' '}
                          {t('waiting since {when}', { when: formatDateTime(o.waitingSince) })}
                          {o.offersTried > 0 && ` · ${t('{n} offers tried', { n: o.offersTried })}`}
                        </p>
                        {o.pendingOffer && (
                          <p className="text-xs text-ink-700">
                            {t('Offer to {maker}, expires {when}', {
                              maker: o.pendingOffer.maker ?? '—',
                              when: formatDateTime(o.pendingOffer.expiresAt),
                            })}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Money minor={o.totalMinor} currency={o.currency} className="text-sm" />
                        <ChevronRight className="h-4 w-4 text-ink-500" aria-hidden="true" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )
        })
      )}
    </div>
  )
}

AdminMatching.layout = 'dashboard'
AdminMatching.dashboardProps = { navItems: adminNav, title: 'Admin' }
