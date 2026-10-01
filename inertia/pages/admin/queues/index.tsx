import { createContext, useContext, useState, type ReactNode } from 'react'
import { router } from '@inertiajs/react'
import { CheckCircle2 } from 'lucide-react'
import { adminNav } from '~/lib/nav'
import { formatDateTime } from '~/lib/format'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Money } from '~/components/money'
import { OrderCode } from '~/components/order_code'
import { PageHeader } from '~/components/page_header'
import { EmptyState } from '~/components/empty_state'
import { useT } from '~/lib/i18n'

type Unmatched = {
  id: string
  code: string
  matchingRound: number
  totalMinor: number
  currency: string
  since: string | null
}
type Overdue = {
  jobId: string
  orderId: string
  orderCode: string
  status: string
  manufacturerAlias: string
  dueAt: string | null
  critical: boolean
}
type PaymentReview = {
  ref: string
  providerRef: string | null
  reason: string | null
  at: string | null
}
type Finding = {
  ref: string
  kind: string
  orderId: string | null
  detail: string
  at: string | null
}
type FraudItem = {
  orderId: string
  orderCode: string
  status: string
  totalMinor: number
  currency: string
  holding: boolean
  flags: Array<{ rule: string; severity: string; detail: string }>
}
type Report = {
  id: string
  reason: string
  details: string | null
  productId: string | null
  productTitle: string | null
  createdAt: string | null
}
type Chargeback = {
  id: string
  orderId: string
  orderCode: string
  amountMinor: number
  currency: string
  createdAt: string | null
}
type SupportItem = {
  id: string
  email: string
  topic: string
  orderCode: string | null
  message: string
  createdAt: string | null
}
type PendingMaker = {
  id: string
  alias: string
  email: string
  city: string | null
  country: string
  isCorporate: boolean
  createdAt: string | null
}

type BulkAction =
  'photos.approve' | 'photos.reject' | 'support.answered' | 'ack.payment_review' | 'ack.reconcile'

type Bulk = {
  ids: string[]
  actions: Array<{ action: BulkAction; label: string; outline?: boolean }>
}

const Selection = createContext<{ selected: Set<string>; toggle: (id: string) => void } | null>(
  null
)

/** A row's tick box in a queue that allows bulk decisions; renders nothing elsewhere. */
function RowCheck({ id, label }: { id: string | number; label: string }) {
  const ctx = useContext(Selection)
  if (!ctx) return null
  const key = String(id)
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={ctx.selected.has(key)}
      onChange={() => ctx.toggle(key)}
      className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-ink-900"
    />
  )
}

/**
 * A queue with work in it; an empty queue is not drawn here but listed as clear at the bottom.
 * Routine queues (`bulk`) get tick boxes and a bar to apply one decision to the selected items.
 */
function Section({
  id,
  title,
  count,
  bulk,
  children,
}: {
  id: string
  title: string
  count: number
  bulk?: Bulk
  children: ReactNode
}) {
  const { t } = useT()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  if (count === 0) return null

  const ids = bulk?.ids ?? []
  const all = ids.length > 0 && ids.every((i) => selected.has(i))
  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  const run = (action: BulkAction) =>
    router.post(
      '/admin/queues/bulk',
      { action, refs: [...selected] },
      {
        preserveScroll: true,
        onStart: () => setBusy(true),
        onFinish: () => setBusy(false),
        onSuccess: () => setSelected(new Set()),
      }
    )

  return (
    <section id={id} className="scroll-mt-6 space-y-3">
      <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-ink-900">
        {title}
        <Badge variant="destructive">{count}</Badge>
      </h2>
      {bulk && ids.length > 1 && (
        <div className="flex min-h-11 flex-wrap items-center gap-3 rounded-lg border border-line bg-paper-sunken px-5 py-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink-800">
            <input
              type="checkbox"
              checked={all}
              onChange={() => setSelected(all ? new Set() : new Set(ids))}
              className="h-4 w-4 cursor-pointer accent-ink-900"
            />
            {t('Select all')}
          </label>
          {selected.size > 0 && (
            <>
              <span className="text-sm text-ink-600" aria-live="polite">
                {t('{count} selected', { count: selected.size })}
              </span>
              <span className="flex flex-wrap gap-2 sm:ml-auto">
                {bulk.actions.map((a) => (
                  <Button
                    key={a.action}
                    size="sm"
                    variant={a.outline ? 'outline' : 'default'}
                    disabled={busy}
                    onClick={() => run(a.action)}
                  >
                    {a.label}
                  </Button>
                ))}
              </span>
            </>
          )}
        </div>
      )}
      <Selection.Provider value={bulk ? { selected, toggle } : null}>
        <ul className="divide-y divide-line rounded-lg border border-line bg-paper-raised">
          {children}
        </ul>
      </Selection.Provider>
    </section>
  )
}

const acknowledge = (queue: 'payment_review' | 'reconcile', ref: string) =>
  router.post('/admin/queues/acknowledge', { queue, ref })

export default function AdminQueues({
  unmatched,
  overdue,
  paymentReviews,
  reconcile,
  pendingMakers,
  fraud,
  reports,
  chargebacks,
  support,
  shopPhotos,
}: {
  unmatched: Unmatched[]
  overdue: Overdue[]
  paymentReviews: PaymentReview[]
  reconcile: Finding[]
  pendingMakers: PendingMaker[]
  fraud: FraudItem[]
  reports: Report[]
  chargebacks: Chargeback[]
  support: SupportItem[]
  shopPhotos: { id: string; url: string; product: string; createdAt: string | null }[]
}) {
  const { t } = useT()

  const total =
    unmatched.length +
    overdue.length +
    paymentReviews.length +
    reconcile.length +
    pendingMakers.length +
    fraud.length +
    reports.length +
    chargebacks.length +
    support.length +
    shopPhotos.length

  const clear = [
    { title: 'Makers waiting for approval', count: pendingMakers.length },
    { title: 'Orders flagged for fraud review', count: fraud.length },
    { title: 'Support requests', count: support.length },
    { title: 'Card chargebacks', count: chargebacks.length },
    { title: 'Shop photos to review', count: shopPhotos.length },
    { title: 'Reported listings', count: reports.length },
    { title: 'Unmatched orders', count: unmatched.length },
    { title: 'Production past deadline', count: overdue.length },
    { title: 'Payments needing review', count: paymentReviews.length },
    { title: 'Ledger reconciliation', count: reconcile.length },
  ].filter((q) => q.count === 0)

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('Work queues')}
        description={t('Everything that is stuck or waiting for a person, oldest first.')}
      />

      {total === 0 && (
        <EmptyState
          icon={CheckCircle2}
          title={t('All queues are clear')}
          description={t('Nothing is unmatched, late, waiting for review or waiting for approval.')}
        />
      )}

      <Section id="makers" title={t('Makers waiting for approval')} count={pendingMakers.length}>
        {pendingMakers.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
            <div>
              <p className="font-medium text-ink-900">
                {m.alias} · {m.email}
              </p>
              <p className="text-xs text-ink-600">
                {[m.city, m.country].filter(Boolean).join(', ')} ·{' '}
                {m.isCorporate ? 'company' : 'individual'} · applied {formatDateTime(m.createdAt)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => router.post(`/admin/queues/makers/${m.id}`, { decision: 'approve' })}
              >
                {t('Approve')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.post(`/admin/queues/makers/${m.id}`, { decision: 'reject' })}
              >
                {t('Reject')}
              </Button>
            </div>
          </li>
        ))}
      </Section>

      <Section id="fraud" title={t('Orders flagged for fraud review')} count={fraud.length}>
        {fraud.map((f) => (
          <li
            key={f.orderId}
            className="flex flex-wrap items-start justify-between gap-3 px-5 py-3"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <OrderCode code={f.orderCode} />
                <Money minor={f.totalMinor} currency={f.currency} className="text-sm" />
                {f.holding && <Badge variant="destructive">{t('Held before matching')}</Badge>}
              </div>
              <ul className="text-xs text-ink-600">
                {f.flags.map((x) => (
                  <li key={x.rule}>
                    {x.rule.replaceAll('_', ' ')} — {x.detail}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() =>
                  router.post(`/admin/queues/fraud/${f.orderId}`, { decision: 'clear' })
                }
              >
                {t('Looks fine')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  router.post(`/admin/queues/fraud/${f.orderId}`, { decision: 'reject' })
                }
              >
                {t('Reject and refund')}
              </Button>
            </div>
          </li>
        ))}
      </Section>

      <Section
        id="support"
        title={t('Support requests')}
        count={support.length}
        bulk={{
          ids: support.map((r) => String(r.id)),
          actions: [{ action: 'support.answered', label: t('Mark selected answered') }],
        }}
      >
        {support.map((r) => (
          <li key={r.id} className="space-y-1 px-5 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-start gap-3 font-medium text-ink-900">
                <RowCheck id={r.id} label={t('Select request from {email}', { email: r.email })} />
                {r.topic} <span className="font-normal text-ink-600">· {r.email}</span>
                {r.orderCode && <span className="ml-2 font-mono text-xs">{r.orderCode}</span>}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.post(`/admin/queues/support/${r.id}`)}
              >
                {t('Mark answered')}
              </Button>
            </div>
            <p className="whitespace-pre-wrap text-sm text-ink-700">{r.message}</p>
            <p className="text-xs text-ink-600">{formatDateTime(r.createdAt)}</p>
          </li>
        ))}
      </Section>

      <Section id="chargebacks" title={t('Card chargebacks')} count={chargebacks.length}>
        {chargebacks.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
            <div>
              <div className="flex items-center gap-2">
                <OrderCode code={c.orderCode} />
                <Money minor={c.amountMinor} currency={c.currency} className="text-sm" />
              </div>
              <p className="text-xs text-ink-600">
                {t('Opened {when} · payouts for this order are on hold', {
                  when: formatDateTime(c.createdAt),
                })}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() =>
                  router.post(`/admin/queues/chargebacks/${c.id}`, { decision: 'won' })
                }
              >
                {t('We won')}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() =>
                  router.post(`/admin/queues/chargebacks/${c.id}`, { decision: 'lost' })
                }
              >
                {t('We lost')}
              </Button>
            </div>
          </li>
        ))}
      </Section>

      <Section
        id="shop-photos"
        title={t('Shop photos to review')}
        count={shopPhotos.length}
        bulk={{
          ids: shopPhotos.map((p) => String(p.id)),
          actions: [
            { action: 'photos.approve', label: t('Show selected in shop') },
            { action: 'photos.reject', label: t('Reject selected'), outline: true },
          ],
        }}
      >
        {shopPhotos.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-3">
            <div className="flex items-center gap-4">
              <RowCheck id={p.id} label={t('Select photo of {product}', { product: p.product })} />
              <a href={p.url} target="_blank" rel="noreferrer">
                <img
                  src={p.url}
                  alt={t('Photo offered for {product}', { product: p.product })}
                  className="h-24 w-24 rounded-md border border-line object-cover"
                />
              </a>
              <div>
                <p className="font-medium text-ink-900">{p.product}</p>
                <p className="max-w-sm text-xs text-ink-600">
                  {t(
                    'Approve only if nothing identifies the maker: no name, logo, address, face or shipping label.'
                  )}
                </p>
                <p className="text-xs text-ink-600">{formatDateTime(p.createdAt)}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => router.post(`/admin/queues/photos/${p.id}`, { decision: 'approve' })}
              >
                {t('Show in shop')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.post(`/admin/queues/photos/${p.id}`, { decision: 'reject' })}
              >
                {t('Reject')}
              </Button>
            </div>
          </li>
        ))}
      </Section>

      <Section id="reports" title={t('Reported listings')} count={reports.length}>
        {reports.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
            <div>
              <p className="font-medium text-ink-900">
                {r.productTitle ?? 'Listing'} <Badge variant="outline">{r.reason}</Badge>
              </p>
              {r.details && <p className="text-xs text-ink-600">{r.details}</p>}
              <p className="text-xs text-ink-600">{formatDateTime(r.createdAt)}</p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={() =>
                  router.post(`/admin/queues/reports/${r.id}`, {
                    decision: 'block',
                    reason: r.reason,
                  })
                }
              >
                {t('Block model')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  router.post(`/admin/queues/reports/${r.id}`, { decision: 'dismiss' })
                }
              >
                {t('Dismiss')}
              </Button>
            </div>
          </li>
        ))}
      </Section>

      <Section id="unmatched" title={t('Unmatched orders')} count={unmatched.length}>
        {unmatched.map((o) => (
          <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
            <div>
              <OrderCode code={o.code} />
              <p className="text-xs text-ink-600">
                {t('{matchingRound} rounds tried · unmatched since {when}', {
                  matchingRound: o.matchingRound,
                  when: formatDateTime(o.since),
                })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Money minor={o.totalMinor} currency={o.currency} className="text-sm" />
              <Button
                size="sm"
                variant="accent"
                onClick={() => router.post(`/admin/queues/orders/${o.id}/rematch`)}
              >
                {t('Re-match')}
              </Button>
            </div>
          </li>
        ))}
      </Section>

      <Section id="overdue" title={t('Production past deadline')} count={overdue.length}>
        {overdue.map((j) => (
          <li key={j.jobId} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
            <div>
              <OrderCode code={j.orderCode} />
              <p className="text-xs text-ink-600">
                {t('{manufacturerAlias} · {status} · due {when}', {
                  manufacturerAlias: j.manufacturerAlias,
                  status: j.status,
                  when: formatDateTime(j.dueAt),
                })}
              </p>
            </div>
            {j.critical && <Badge variant="destructive">{t('Past 2× deadline')}</Badge>}
          </li>
        ))}
      </Section>

      <Section
        id="payment-reviews"
        title={t('Payments needing review')}
        count={paymentReviews.length}
        bulk={{
          ids: paymentReviews.map((p) => p.ref),
          actions: [{ action: 'ack.payment_review', label: t('Mark selected handled') }],
        }}
      >
        {paymentReviews.map((p) => (
          <li key={p.ref} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
            <div className="flex items-start gap-3">
              <RowCheck id={p.ref} label={t('Select event {ref}', { ref: p.ref })} />
              <div>
                <p className="font-medium text-ink-900">{p.reason ?? 'Needs review'}</p>
                <p className="text-xs text-ink-600">
                  {t('provider ref {v2} · event {ref} · {when}', {
                    v2: p.providerRef ?? '—',
                    ref: p.ref,
                    when: formatDateTime(p.at),
                  })}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => acknowledge('payment_review', p.ref)}
            >
              {t('Mark handled')}
            </Button>
          </li>
        ))}
      </Section>

      <Section
        id="reconcile"
        title={t('Ledger reconciliation')}
        count={reconcile.length}
        bulk={{
          ids: reconcile.map((f) => f.ref),
          actions: [{ action: 'ack.reconcile', label: t('Mark selected handled') }],
        }}
      >
        {reconcile.map((f) => (
          <li key={f.ref} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
            <div className="flex items-start gap-3">
              <RowCheck id={f.ref} label={t('Select finding {ref}', { ref: f.ref })} />
              <div>
                <p className="font-medium text-ink-900">{f.kind.replaceAll('_', ' ')}</p>
                <p className="text-xs text-ink-600">
                  {f.orderId ? `order #${f.orderId} · ` : ''}
                  {f.detail} · {formatDateTime(f.at)}
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => acknowledge('reconcile', f.ref)}>
              {t('Mark handled')}
            </Button>
          </li>
        ))}
      </Section>
      {total > 0 && clear.length > 0 && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-line bg-paper-raised px-5 py-3 text-sm text-ink-600">
          <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
          <span className="font-medium text-ink-800">{t('Clear:')}</span>
          {clear.map((q) => t(q.title)).join(' · ')}
        </p>
      )}
    </div>
  )
}

AdminQueues.layout = 'dashboard'
AdminQueues.dashboardProps = { navItems: adminNav, title: 'Admin' }
