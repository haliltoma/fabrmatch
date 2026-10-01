import { useState, type ReactNode } from 'react'
import { router } from '@inertiajs/react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Link } from '@adonisjs/inertia/react'
import { ArrowLeft } from 'lucide-react'
import { adminNav } from '~/lib/nav'
import { formatDateTime } from '~/lib/format'
import { Badge } from '~/components/ui/badge'
import { Money } from '~/components/money'
import { OrderCode } from '~/components/order_code'
import { StatusBadge } from '~/components/status_badge'
import { useT } from '~/lib/i18n'

type Props = {
  order: {
    id: string
    code: string
    status: string
    channel: string
    currency: string
    subtotalMinor: number
    shippingMinor: number
    totalMinor: number
    platformFeeMinor: number
    sellerShareMinor: number
    requiredTrustTier: number
    matchingRound: number
    buyerId: string
    sellerId: string | null
    shippingAddress: {
      fullName: string
      line1: string
      city: string
      postalCode: string
      country: string
    } | null
  }
  items: Array<{
    file: string | null
    technology: string
    material: string
    quantity: number
    unitCostMinor: number
  }>
  jobs: Array<{
    id: string
    status: string
    alias: string | null
    dueAt: string | null
    carrier: string | null
    trackingNumber: string | null
  }>
  timeline: Array<{ at: string | null; action: string; actorId: string | null; meta: string }>
  ledger: Array<{
    id: string
    transactionId: string
    account: string
    direction: string
    amountMinor: number
    memo: string | null
  }>
  ledgerBalances: Record<string, number>
  ledgerBalanced: boolean
  payments: Array<{
    id: string
    status: string
    amountMinor: number
    refundedMinor: number
    providerRef: string
  }>
  webhooks: Array<{ eventId: string; type: string; processed: boolean }>
  payouts: Array<{ id: string; beneficiary: string; amountMinor: number; status: string }>
  disputes: Array<{ id: string; status: string }>
  fraudFlags: Array<{ rule: string; severity: string; status: string; detail: string }>
  messageCount: number
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2 rounded-lg border border-line bg-paper-raised p-5">
      <h2 className="font-display text-lg font-semibold text-ink-900">{title}</h2>
      {children}
    </section>
  )
}

const Empty = () => {
  const { t } = useT()
  return <p className="text-sm text-ink-600">{t('None.')}</p>
}

/** Stuck in production: cancel the maker's job and send the order back to matching. */
function ReassignForm({ orderId }: { orderId: string }) {
  const { t } = useT()
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <form
      className="flex flex-wrap items-end gap-2 rounded-md border border-line p-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (!window.confirm(t('Cancel this job and offer the order to another maker?'))) return
        setBusy(true)
        router.post(
          `/admin/orders/${orderId}/reassign`,
          { reason },
          { preserveScroll: true, onFinish: () => setBusy(false) }
        )
      }}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <Label htmlFor="reassign-reason">{t('Reason for moving to another maker')}</Label>
        <Input
          id="reassign-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t('e.g. no reply for 3 days after the due date')}
        />
      </div>
      <Button type="submit" variant="outline" disabled={busy || reason.trim().length < 3}>
        {busy ? t('Moving…') : t('Move to another maker')}
      </Button>
    </form>
  )
}

export default function AdminOrderHealth(p: Props) {
  const { t } = useT()

  const o = p.order
  return (
    <div className="space-y-6">
      <Link href="/admin/orders" className="inline-flex items-center gap-1 text-sm text-ink-600">
        <ArrowLeft className="h-4 w-4" /> {t('All orders')}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold text-ink-900">
          <OrderCode code={o.code} className="text-3xl font-semibold" />
        </h1>
        <div className="flex items-center gap-3">
          <Link href={`/admin/orders/${o.id}/messages`} className="text-sm text-heat-700 underline">
            {t('Messages ({messageCount})', { messageCount: p.messageCount })}
          </Link>
          <StatusBadge status={o.status} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={t('Money')}>
          <dl className="grid grid-cols-2 gap-1 text-sm">
            {(
              [
                ['Items', o.subtotalMinor],
                ['Shipping', o.shippingMinor],
                ['Total', o.totalMinor],
                ['Platform fee', o.platformFeeMinor],
                ['Seller share', o.sellerShareMinor],
              ] as const
            ).map(([label, minor]) => (
              <div key={label} className="contents">
                <dt className="text-ink-600">{label}</dt>
                <dd>
                  <Money minor={minor} currency={o.currency} />
                </dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-ink-600">
            Channel {o.channel} · buyer #{o.buyerId}
            {o.sellerId ? ` · seller #${o.sellerId}` : ''} · needs tier {o.requiredTrustTier} ·
            matching round {o.matchingRound}
          </p>
        </Panel>

        <Panel title={t('Production')}>
          {p.jobs.length === 0 ? (
            <Empty />
          ) : (
            p.jobs.map((j) => (
              <p key={j.id} className="text-sm">
                Job #{j.id} · {j.alias ?? 'unassigned'} · <StatusBadge status={j.status} /> · due{' '}
                {formatDateTime(j.dueAt)}
                {j.trackingNumber ? ` · ${j.carrier} ${j.trackingNumber}` : ''}
              </p>
            ))
          )}
          {o.status === 'in_production' && <ReassignForm orderId={o.id} />}
          {o.shippingAddress && (
            <p className="text-xs text-ink-600">
              {t('Ship to {fullName}, {line1}, {postalCode} {city}, {country}', {
                fullName: o.shippingAddress.fullName,
                line1: o.shippingAddress.line1,
                postalCode: o.shippingAddress.postalCode,
                city: o.shippingAddress.city,
                country: o.shippingAddress.country,
              })}
            </p>
          )}
          <ul className="text-sm text-ink-700">
            {p.items.map((i, n) => (
              <li key={n}>
                {i.quantity}× {i.file ?? 'model'} · {i.technology} {i.material}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title={t('Payments and payouts')}>
          {p.payments.length === 0 ? (
            <Empty />
          ) : (
            p.payments.map((x) => (
              <p key={x.id} className="text-sm">
                <Badge variant="outline">{t(x.status)}</Badge>{' '}
                <Money minor={x.amountMinor} currency={o.currency} /> {t('· refunded')}{' '}
                <Money minor={x.refundedMinor} currency={o.currency} /> ·{' '}
                <span className="font-mono text-xs">{x.providerRef}</span>
              </p>
            ))
          )}
          {p.webhooks.map((w) => (
            <p key={w.eventId} className="text-xs text-ink-600">
              webhook {w.type} · {w.eventId} · {w.processed ? 'processed' : t('NOT processed')}
            </p>
          ))}
          {p.payouts.map((x) => (
            <p key={x.id} className="text-sm">
              Payout to {x.beneficiary}: <Money minor={x.amountMinor} currency={o.currency} />{' '}
              <Badge variant="outline">{t(x.status)}</Badge>
            </p>
          ))}
        </Panel>

        <Panel title={t('Risk and disputes')}>
          {p.fraudFlags.length === 0 && p.disputes.length === 0 && <Empty />}
          {p.fraudFlags.map((f) => (
            <p key={f.rule} className="text-sm">
              <Badge variant={f.severity === 'hold' ? 'destructive' : 'warning'}>{f.rule}</Badge>{' '}
              {f.status} — {f.detail}
            </p>
          ))}
          {p.disputes.map((d) => (
            <p key={d.id} className="text-sm">
              <Link href={`/admin/disputes/${d.id}`} className="underline">
                {t('Dispute #{id}', { id: d.id })}
              </Link>{' '}
              · {d.status}
            </p>
          ))}
        </Panel>
      </div>

      <Panel title={t('Ledger')}>
        <p className={`text-sm font-medium ${p.ledgerBalanced ? 'text-success' : 'text-danger'}`}>
          {p.ledgerBalanced ? t('Balanced') : t('NOT balanced — investigate')}
          {Object.entries(p.ledgerBalances).map(([account, bal]) => (
            <span key={account} className="ml-3 text-xs font-normal text-ink-600">
              {account}: {bal}
            </span>
          ))}
        </p>
        {p.ledger.length === 0 ? (
          <Empty />
        ) : (
          <table className="w-full text-left text-xs">
            <tbody className="divide-y divide-line">
              {p.ledger.map((e) => (
                <tr key={e.id}>
                  <td className="py-1 font-mono text-ink-500">{e.transactionId.slice(0, 8)}</td>
                  <td>{e.account}</td>
                  <td>{e.direction}</td>
                  <td className="tabular text-right">{e.amountMinor}</td>
                  <td className="pl-3 text-ink-600">{e.memo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <Panel title={t('Timeline')}>
        <ol className="space-y-1 text-sm">
          {p.timeline.map((ev, n) => (
            <li key={n} className="flex flex-wrap gap-x-3">
              <span className="tabular text-ink-600">{formatDateTime(ev.at)}</span>
              <span className="font-medium text-ink-900">{ev.action}</span>
              <span className="text-ink-600">{ev.actorId ? `user #${ev.actorId}` : 'system'}</span>
              {ev.meta !== '{}' && (
                <span className="font-mono text-xs text-ink-600">{ev.meta}</span>
              )}
            </li>
          ))}
        </ol>
      </Panel>
    </div>
  )
}

AdminOrderHealth.layout = 'dashboard'
AdminOrderHealth.dashboardProps = { navItems: adminNav, title: 'Admin' }
