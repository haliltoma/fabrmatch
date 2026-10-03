import { useState } from 'react'
import { FormErrors } from '~/components/field_error'
import { router } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { uploadDisputeEvidence } from '~/lib/api'
import { formatDateTime, formatMoney } from '~/lib/format'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Label } from '~/components/ui/label'
import { Input } from '~/components/ui/input'
import { Badge } from '~/components/ui/badge'
import { LayerStepper } from '~/components/layer_stepper'
import { OrderCode } from '~/components/order_code'
import { StatusBadge } from '~/components/status_badge'
import { OrderNextStep } from '~/components/order_next_step'
import { RevisionAnswer, type OpenRevision } from '~/components/revision_answer'
import { colourLabel, type ItemColour } from '~/lib/colours'
import { useT } from '~/lib/i18n'
import { useIdempotencyKey } from '~/lib/idempotency'

type OrderItem = {
  id: string
  fileName: string | null
  technology: string
  material: string
  color: string | null
  colours?: ItemColour[]
  buyerNote?: string | null
  finishing: string | null
  finishingColour?: string | null
  quantity: number
  unitCostMinor: number
}

type OrderData = {
  id: string
  code: string
  status: string
  channel: string
  currency: string
  subtotalMinor: number
  shippingMinor: number
  totalMinor: number
  taxRateBps: number
  taxMinor: number
  items: OrderItem[]
  shipment: { carrier: string | null; trackingNumber: string | null; shippedAt: string | null }
  deliveredAt: string | null
  completedAt: string | null
  createdAt: string | null
}

type TimelineEntry = { status: string; at: string }

type DisputeData = {
  id: string
  status: string
  reason: string
  manufacturerResponse: string | null
  resolution: string | null
  refundMinor: number
  evidence: Array<{ id: string; note: string | null; by: 'buyer' | 'manufacturer' }>
} | null

type ReviewData = { rating: number; comment: string | null } | null

function DisputeSection({
  order,
  dispute,
  evidenceUrls,
}: {
  order: OrderData
  dispute: DisputeData
  evidenceUrls: Record<string, string>
}) {
  const { t } = useT()

  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  if (!dispute) {
    if (order.status !== 'delivered') return null
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('Something wrong?')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              setBusy(true)
              router.post(
                `/orders/${order.id}/dispute`,
                { reason },
                { onFinish: () => setBusy(false) }
              )
            }}
          >
            <p className="text-sm text-ink-600">
              {t(
                'Open a dispute within the review window. Payment to the manufacturer is held until it is resolved.'
              )}
            </p>
            <textarea
              className="flex min-h-24 w-full rounded-md border border-line bg-paper-raised px-3 py-2 text-sm"
              minLength={10}
              maxLength={2000}
              required
              placeholder={t('Describe the problem (at least 10 characters)')}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <Button type="submit" variant="outline" size="sm" disabled={busy}>
              {t('Open dispute')}
            </Button>
          </form>
        </CardContent>
      </Card>
    )
  }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !dispute) return
    try {
      setBusy(true)
      await uploadDisputeEvidence(dispute.id, file)
      router.reload()
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{t('Dispute')}</CardTitle>
        <Badge variant={dispute.status === 'resolved' ? 'success' : 'destructive'}>
          {dispute.status}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-ink-800">
        <p className="whitespace-pre-wrap">{dispute.reason}</p>

        {dispute.manufacturerResponse && (
          <div className="rounded-md bg-paper-sunken p-3">
            <p className="mb-1 text-xs font-medium text-ink-600">{t("Manufacturer's response")}</p>
            <p className="whitespace-pre-wrap">{dispute.manufacturerResponse}</p>
          </div>
        )}

        {dispute.evidence.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {dispute.evidence.map((ev) => (
              <a key={ev.id} href={evidenceUrls[ev.id]} target="_blank" rel="noopener noreferrer">
                <img
                  src={evidenceUrls[ev.id]}
                  alt={ev.note ?? 'Dispute evidence'}
                  className="h-24 w-full rounded-md border border-line object-cover"
                />
              </a>
            ))}
          </div>
        )}

        {dispute.status === 'resolved' ? (
          <p className="font-medium">
            {t('Decision: {resolution}', {
              resolution: t(dispute.resolution?.replace('_', ' ') ?? ''),
            })}
            {dispute.refundMinor > 0
              ? ` — ${t('{amount} refunded to you', {
                  amount: formatMoney(dispute.refundMinor, order.currency),
                })}`
              : ''}
          </p>
        ) : (
          <label className="inline-block">
            <span className="sr-only">{t('Add a photo')}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              onChange={onPhoto}
              className="text-xs"
            />
          </label>
        )}
      </CardContent>
    </Card>
  )
}

function ReviewForm({ orderId }: { orderId: string }) {
  const { t } = useT()

  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    router.post(`/orders/${orderId}/review`, {
      rating,
      comment: comment || undefined,
    })
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <Label>{t('How was the print quality?')}</Label>
        <div className="flex gap-1 pt-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              aria-label={`${star} stars`}
              onClick={() => setRating(star)}
              className={`text-2xl transition-transform hover:scale-110 ${
                star <= rating ? 'text-amber-ink' : 'text-ink-500'
              }`}
            >
              ★
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label htmlFor="review-comment">{t('Comment (optional)')}</Label>
        <textarea
          id="review-comment"
          className="flex min-h-20 w-full rounded-md border border-line bg-paper-raised px-3 py-2 text-sm"
          maxLength={1000}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>
      <Button type="submit" size="sm">
        {t('Submit review')}
      </Button>
    </form>
  )
}

export default function OrdersShow({
  order,
  timeline,
  review,
  dispute,
  evidenceUrls,
  testPayments,
  payStep,
  paymentReturn,
  walletBalanceMinor,
  confirmDays,
  revision,
}: {
  order: OrderData
  timeline: TimelineEntry[]
  review: ReviewData
  dispute: DisputeData
  evidenceUrls: Record<string, string>
  testPayments: boolean
  /** Set when the provider needs the buyer's identity number (iyzico) */
  payStep: { phoneOnFile: boolean; country: string } | null
  paymentReturn: 'paid' | 'failed' | 'pending' | null
  /** The buyer's wallet balance while the order can be paid (sellers only have one) */
  walletBalanceMinor: number | null
  /** Days after delivery to check the part or open a dispute (orders.autoConfirmDays) */
  confirmDays: number
  /** Paket Y: the maker asked something before accepting; null when nothing waits */
  revision: OpenRevision | null
}) {
  const { t } = useT()

  const canCancel = ['draft', 'awaiting_payment'].includes(order.status)
  const canCancelAndRefund = ['paid', 'matching', 'unmatched'].includes(order.status)
  const canPay = ['draft', 'awaiting_payment'].includes(order.status)
  const payKey = useIdempotencyKey()
  const [payer, setPayer] = useState({ identityNumber: '', phone: '' })
  const [paying, setPaying] = useState(false)
  // one state change at a time: a double click must not send "confirm delivery" twice
  const [acting, setActing] = useState(false)
  const act = (path: string) =>
    router.post(path, {}, { onStart: () => setActing(true), onFinish: () => setActing(false) })
  const pay = () => {
    setPaying(true)
    router.post(
      `/orders/${order.id}/pay`,
      payStep
        ? { identityNumber: payer.identityNumber.trim(), phone: payer.phone.trim() || undefined }
        : {},
      {
        headers: payKey.headers(),
        onError: payKey.renew,
        onFinish: () => {
          payKey.renew()
          setPaying(false)
        },
      }
    )
  }
  const canConfirmDelivery = order.status === 'shipped'
  const canComplete = order.status === 'delivered'
  const canReview =
    order.status === 'delivered' || (order.status === 'completed' && review !== null)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/orders"
        className="inline-flex items-center gap-1 text-sm text-ink-600 hover:text-ink-800"
      >
        <ArrowLeft className="h-4 w-4" /> {t('Back to orders')}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink-900">
            <OrderCode code={order.code} className="text-3xl font-semibold" />
          </h1>
          <p className="text-ink-600">
            {t('Placed {when}', { when: formatDateTime(order.createdAt) })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {order.status === 'completed' && (
            <a
              href={`/orders/${order.id}/invoice`}
              className="text-sm font-medium text-heat-700 underline"
            >
              {t('Service-fee invoice')}
            </a>
          )}
          {['in_production', 'shipped', 'delivered', 'disputed'].includes(order.status) && (
            <Link
              href={`/orders/${order.id}/messages`}
              className="text-sm font-medium text-heat-700 underline"
            >
              {t('Message the maker')}
            </Link>
          )}
          <StatusBadge status={order.status} />
        </div>
      </div>

      {paymentReturn === 'paid' && (
        <p
          role="status"
          className="rounded-md border border-line bg-paper-sunken px-4 py-3 text-sm text-success"
        >
          {t('Payment received. We are finding a maker for your order.')}
        </p>
      )}
      {paymentReturn === 'pending' && (
        <p role="status" className="rounded-md bg-amber-soft px-4 py-3 text-sm text-amber-ink">
          {t('Your payment is being checked by the bank. This page updates once it is confirmed.')}
        </p>
      )}
      {paymentReturn === 'failed' && canPay && (
        <p role="alert" className="rounded-md bg-danger-soft px-4 py-3 text-sm text-danger">
          {t('The payment did not go through and no money was taken. You can try again.')}
        </p>
      )}

      {revision && (
        <RevisionAnswer
          orderId={order.id}
          items={order.items}
          revision={revision}
          canCancel={['paid', 'matching', 'unmatched'].includes(order.status)}
        />
      )}

      <OrderNextStep
        status={order.status}
        confirmDays={confirmDays}
        deliveredAt={order.deliveredAt}
      >
        {canPay && payStep && (
          <form
            className="space-y-3 rounded-md border border-line bg-paper-raised p-4"
            onSubmit={(e) => {
              e.preventDefault()
              pay()
            }}
          >
            <p className="text-sm text-ink-700">
              {t(
                'The payment provider needs your identity number to take a card payment. We pass it on and do not store it.'
              )}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="pay-identity">
                  {payStep.country === 'TR'
                    ? t('T.C. identity number')
                    : t('ID or passport number')}
                </Label>
                <Input
                  id="pay-identity"
                  required
                  inputMode={payStep.country === 'TR' ? 'numeric' : undefined}
                  maxLength={payStep.country === 'TR' ? 11 : 20}
                  autoComplete="off"
                  value={payer.identityNumber}
                  onChange={(e) => setPayer({ ...payer, identityNumber: e.target.value })}
                />
              </div>
              {!payStep.phoneOnFile && (
                <div>
                  <Label htmlFor="pay-phone">{t('Mobile phone')}</Label>
                  <Input
                    id="pay-phone"
                    type="tel"
                    required
                    autoComplete="tel"
                    placeholder="05xx xxx xx xx"
                    value={payer.phone}
                    onChange={(e) => setPayer({ ...payer, phone: e.target.value })}
                  />
                </div>
              )}
            </div>
            <FormErrors />
            <Button type="submit" disabled={paying}>
              {t('Pay now')}
            </Button>
          </form>
        )}

        {canPay && testPayments && (
          <p className="rounded-md border border-line bg-amber-soft px-4 py-3 text-sm text-amber-ink">
            <strong>{t('Test mode')}</strong> ·{' '}
            {t('No real money moves. Pay with the test card on the next page:')}{' '}
            <span className="font-mono tabular">4242 4242 4242 4242</span>
          </p>
        )}

        {(canCancel || canCancelAndRefund || canPay || canConfirmDelivery || canComplete) && (
          <div className="flex flex-wrap gap-2">
            {canPay && !payStep && (
              <Button onClick={pay} disabled={paying}>
                {t('Pay now')}
              </Button>
            )}
            {canPay && walletBalanceMinor !== null && walletBalanceMinor >= order.totalMinor && (
              <Button
                variant="outline"
                disabled={paying}
                onClick={() => {
                  setPaying(true)
                  router.post(
                    `/orders/${order.id}/pay-from-wallet`,
                    {},
                    {
                      headers: payKey.headers(),
                      onFinish: () => {
                        payKey.renew()
                        setPaying(false)
                      },
                    }
                  )
                }}
              >
                {t('Pay from balance ({amount})', {
                  amount: formatMoney(walletBalanceMinor, 'TRY'),
                })}
              </Button>
            )}
            {canConfirmDelivery && (
              <Button disabled={acting} onClick={() => act(`/orders/${order.id}/delivered`)}>
                {t('Confirm delivery')}
              </Button>
            )}
            {canComplete && (
              <Button disabled={acting} onClick={() => act(`/orders/${order.id}/complete`)}>
                {t('Complete order')}
              </Button>
            )}
            {canCancelAndRefund && (
              <Button
                variant="outline"
                disabled={acting}
                onClick={() => {
                  if (
                    window.confirm(t('Cancel this order? Your payment will be refunded in full.'))
                  ) {
                    act(`/orders/${order.id}/cancel`)
                  }
                }}
              >
                {t('Cancel and refund')}
              </Button>
            )}
            {canCancel && (
              <Button
                variant="outline"
                disabled={acting}
                onClick={() => act(`/orders/${order.id}/cancel`)}
              >
                {t('Cancel order')}
              </Button>
            )}
          </div>
        )}
      </OrderNextStep>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('Items')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {order.items.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 text-sm"
            >
              <div>
                <p className="font-medium text-ink-900">
                  {item.fileName ?? 'Model file'} · {item.material}
                  {colourLabel(item.colours, item.color, t)
                    ? ` · ${colourLabel(item.colours, item.color, t)}`
                    : ''}
                  {item.finishing
                    ? ` · ${t(item.finishing)}${item.finishingColour ? ` (${t(item.finishingColour)})` : ''}`
                    : ''}
                </p>
                <p className="text-ink-600">
                  {item.technology} × {item.quantity}
                </p>
              </div>
              <div className="text-right">
                <p>{formatMoney(item.unitCostMinor * item.quantity, order.currency)}</p>
                <p className="text-xs text-ink-600">
                  {t('{amount} each', { amount: formatMoney(item.unitCostMinor, order.currency) })}
                </p>
              </div>
            </div>
          ))}

          <div className="space-y-1 border-t border-line pt-3 text-sm">
            <div className="flex justify-between text-ink-600">
              <span>{t('Subtotal')}</span>
              <span>{formatMoney(order.subtotalMinor, order.currency)}</span>
            </div>
            <div className="flex justify-between text-ink-600">
              <span>{t('Shipping')}</span>
              <span>{formatMoney(order.shippingMinor, order.currency)}</span>
            </div>
            <div className="flex justify-between font-semibold text-ink-900">
              <span>{t('Total')}</span>
              <span>{formatMoney(order.totalMinor, order.currency)}</span>
            </div>
            {order.taxMinor > 0 && (
              <p className="text-xs text-ink-600">
                {t('Includes VAT {v2}%: {amount}', {
                  v2: order.taxRateBps / 100,
                  amount: formatMoney(order.taxMinor, order.currency),
                })}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {order.shipment.trackingNumber && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('Shipment')}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-ink-700">
            <p>
              {t('Carrier:')}{' '}
              <span className="font-medium text-ink-900">{order.shipment.carrier}</span>
            </p>
            <p>
              {t('Tracking:')}{' '}
              <span className="font-medium text-ink-900">{order.shipment.trackingNumber}</span>
            </p>
            {order.shipment.shippedAt && (
              <p className="text-ink-600">
                {t('Shipped {when}', { when: formatDateTime(order.shipment.shippedAt) })}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('Timeline')}</CardTitle>
        </CardHeader>
        <CardContent>
          <LayerStepper entries={timeline} />
        </CardContent>
      </Card>

      <DisputeSection order={order} dispute={dispute} evidenceUrls={evidenceUrls} />

      {canReview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('Review')}</CardTitle>
          </CardHeader>
          <CardContent>
            {review ? (
              <div className="space-y-1 text-sm text-ink-700">
                <p className="font-medium text-amber-ink">{'★'.repeat(review.rating)}</p>
                {review.comment && <p>{review.comment}</p>}
              </div>
            ) : (
              <ReviewForm orderId={order.id} />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
