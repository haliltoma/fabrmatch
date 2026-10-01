import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { sellerNav } from '~/lib/nav'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { MoneyInput } from '~/components/money_input'
import { OrderCode } from '~/components/order_code'
import { PageHeader } from '~/components/page_header'
import { formatDateTime, formatMoney } from '~/lib/format'
import { useIdempotencyKey } from '~/lib/idempotency'
import { useT } from '~/lib/i18n'

type Movement = {
  at: string
  kind: 'top_up' | 'order' | 'refund' | 'withdrawal'
  amountMinor: number
  orderCode: string | null
  orderId: string | null
}

const KIND: Record<Movement['kind'], string> = {
  top_up: 'Top-up',
  order: 'Order paid',
  refund: 'Refund',
  withdrawal: 'Back to card',
}

export default function SellerWallet({
  available,
  balanceMinor,
  autoPay,
  movements,
  needsBilling,
  minMinor,
  maxMinor,
  topUpReturn,
}: {
  available: boolean
  balanceMinor: number
  autoPay: boolean
  movements: Movement[]
  needsBilling: boolean
  minMinor: number
  maxMinor: number
  topUpReturn: 'paid' | 'failed' | 'pending' | null
}) {
  const { t } = useT()
  const key = useIdempotencyKey()
  const [amount, setAmount] = useState<number | null>(50_000)
  const [payer, setPayer] = useState({ identityNumber: '', phone: '' })
  const [billing, setBilling] = useState({
    fullName: '',
    line1: '',
    city: '',
    postalCode: '',
    country: 'TR',
  })
  const [busy, setBusy] = useState(false)
  const valid = amount !== null && amount >= minMinor && amount <= maxMinor

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={t('Wallet')}
        description={t(
          'Add balance once; orders from your own shop are then paid from it the moment they arrive, and printing starts without waiting for you.'
        )}
      />

      {topUpReturn === 'paid' && (
        <p
          role="status"
          className="rounded-md border border-line bg-paper-sunken px-4 py-3 text-sm text-success"
        >
          {t('Balance topped up.')}
        </p>
      )}
      {topUpReturn === 'failed' && (
        <p role="alert" className="rounded-md bg-danger-soft px-4 py-3 text-sm text-danger">
          {t('The payment did not go through and no money was taken. You can try again.')}
        </p>
      )}
      {topUpReturn === 'pending' && (
        <p role="status" className="rounded-md bg-amber-soft px-4 py-3 text-sm text-amber-ink">
          {t('Your payment is being checked by the bank. This page updates once it is confirmed.')}
        </p>
      )}

      <Card className="layer-lines">
        <CardContent className="flex flex-wrap items-end justify-between gap-4 pt-6">
          <div>
            <p className="text-sm text-ink-600">{t('Balance')}</p>
            <p className="font-display text-4xl font-semibold tabular text-ink-900">
              {formatMoney(balanceMinor, 'TRY')}
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-900">
            <input
              type="checkbox"
              className="accent-heat-600"
              checked={autoPay}
              disabled={!available}
              onChange={(e) => router.post('/seller/wallet/auto-pay', { on: e.target.checked })}
            />
            {t('Pay orders from my shops automatically')}
          </label>
          {balanceMinor > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (window.confirm(t('Send your whole balance back to the card it came from?'))) {
                  router.post('/seller/wallet/refund')
                }
              }}
            >
              {t('Refund balance to card')}
            </Button>
          )}
        </CardContent>
      </Card>

      {!available ? (
        <p className="rounded-md bg-paper-sunken px-4 py-3 text-sm text-ink-700">
          {t('The wallet is not available in the current sales model.')}
        </p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t('Add balance')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (!valid) return
                setBusy(true)
                router.post(
                  '/seller/wallet/top-up',
                  {
                    amountMinor: amount,
                    ...(needsBilling
                      ? {
                          identityNumber: payer.identityNumber.trim(),
                          phone: payer.phone.trim() || undefined,
                          billing,
                        }
                      : {}),
                  },
                  {
                    headers: key.headers(),
                    onError: key.renew,
                    onFinish: () => {
                      key.renew()
                      setBusy(false)
                    },
                  }
                )
              }}
            >
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="w-amount">{t('Amount')}</Label>
                <MoneyInput id="w-amount" required valueMinor={amount} onChange={setAmount} />
                <p className="text-xs text-ink-600">
                  {t('Between {min} and {max}.', {
                    min: formatMoney(minMinor, 'TRY'),
                    max: formatMoney(maxMinor, 'TRY'),
                  })}
                </p>
              </div>
              {needsBilling && (
                <>
                  <div className="space-y-1">
                    <Label htmlFor="w-id">{t('T.C. identity number')}</Label>
                    <Input
                      id="w-id"
                      required
                      inputMode="numeric"
                      maxLength={11}
                      autoComplete="off"
                      value={payer.identityNumber}
                      onChange={(e) => setPayer({ ...payer, identityNumber: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="w-phone">{t('Mobile phone')}</Label>
                    <Input
                      id="w-phone"
                      type="tel"
                      required
                      autoComplete="tel"
                      value={payer.phone}
                      onChange={(e) => setPayer({ ...payer, phone: e.target.value })}
                    />
                  </div>
                  {(
                    [
                      ['fullName', 'Full name', 'name'],
                      ['line1', 'Billing address', 'street-address'],
                      ['city', 'City', 'address-level2'],
                      ['postalCode', 'Postal code', 'postal-code'],
                    ] as const
                  ).map(([field, label, auto]) => (
                    <div key={field} className="space-y-1">
                      <Label htmlFor={`w-${field}`}>{t(label)}</Label>
                      <Input
                        id={`w-${field}`}
                        required={field !== 'postalCode'}
                        autoComplete={auto}
                        value={billing[field]}
                        onChange={(e) => setBilling({ ...billing, [field]: e.target.value })}
                      />
                    </div>
                  ))}
                </>
              )}
              <div className="sm:col-span-2">
                <Button type="submit" disabled={busy || !valid}>
                  {t('Continue to payment')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('Movements')}</CardTitle>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <p className="text-sm text-ink-600">{t('No movements yet.')}</p>
          ) : (
            <ul className="divide-y divide-line">
              {movements.map((m, i) => (
                <li
                  key={i}
                  className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                >
                  <span className="text-ink-900">
                    {t(KIND[m.kind])}
                    {m.orderCode && m.orderId && (
                      <>
                        {' · '}
                        <Link href={`/orders/${m.orderId}`} className="text-heat-700 underline">
                          <OrderCode code={m.orderCode} />
                        </Link>
                      </>
                    )}
                  </span>
                  <span className="flex items-center gap-4">
                    <span className="text-ink-600">{formatDateTime(m.at)}</span>
                    <span
                      className={
                        m.amountMinor < 0 ? 'tabular text-ink-900' : 'tabular text-success'
                      }
                    >
                      {m.amountMinor > 0 ? '+' : ''}
                      {formatMoney(m.amountMinor, 'TRY')}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <p className="text-xs text-ink-600">
        {t(
          'The balance can only be spent on Fabrmatch orders. If an order paid from it is cancelled, the money comes back here.'
        )}
      </p>
    </div>
  )
}

SellerWallet.layout = 'dashboard'
SellerWallet.dashboardProps = { navItems: sellerNav, title: 'Seller' }
