import { useState } from 'react'
import { FieldError, FormErrors } from '~/components/field_error'
import { router } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { ShoppingBag } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { formatDate } from '~/lib/format'
import { useT } from '~/lib/i18n'
import { TermsCheckbox, useLegalAcceptance } from '~/components/terms_checkbox'
import { useIdempotencyKey } from '~/lib/idempotency'
import { EmptyState } from '~/components/empty_state'
import { Money } from '~/components/money'
import { PageHeader } from '~/components/page_header'

type Line = {
  id: string
  fileName: string
  material: string
  profileName: string | null
  finishingName: string | null
  finishingColour?: string | null
  color: string | null
  quantity: number
  unitPriceMinor: number | null
}
type Totals = {
  subtotalMinor: number
  shippingMinor: number
  totalMinor: number
  taxRateBps: number
  taxMinor: number
  discountMinor: number
  currency: string
}

function CartPage({
  lines,
  totals,
  problem,
  eta,
  country,
  currency,
  currencies,
  couponCode,
  couponProblem,
}: {
  lines: Line[]
  totals: Totals | null
  problem: string | null
  eta: { earliest: string; latest: string } | null
  country: string
  currency: string
  currencies: string[]
  couponCode: string
  couponProblem: string | null
}) {
  const { t } = useT()
  const idem = useIdempotencyKey()
  const needsTerms = useLegalAcceptance()
  const [accepted, setAccepted] = useState(false)
  const [coupon, setCoupon] = useState(couponCode)
  const [busy, setBusy] = useState(false)
  const [address, setAddress] = useState({
    fullName: '',
    line1: '',
    city: '',
    postalCode: '',
    country,
    phone: '',
  })
  const set = (key: keyof typeof address) => (v: string) => setAddress((a) => ({ ...a, [key]: v }))

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="sr-only">{t('Your cart')}</h1>
        <EmptyState
          icon={ShoppingBag}
          title={t('Your cart is empty')}
          description={t(
            'Upload a model, choose material and quality, and add it here. Parts of the same technology ship together.'
          )}
          action={
            <Button asChild>
              <Link href="/files">{t('Go to my files')}</Link>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <PageHeader
        title={t('Your cart')}
        description={t('Prices are recalculated at checkout for your delivery address.')}
      />

      <ul className="divide-y divide-line rounded-lg border border-line bg-paper-raised">
        {lines.map((l) => (
          <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
            <div>
              <p className="font-medium text-ink-900">{l.fileName}</p>
              <p className="text-xs text-ink-600">
                {l.material}
                {l.profileName ? ` · ${l.profileName}` : ''}
                {l.finishingName
                  ? ` · ${t(l.finishingName)}${l.finishingColour ? ` (${t(l.finishingColour)})` : ''}`
                  : ''}
                {l.color ? ` · ${l.color}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Input
                aria-label={t('Quantity for {name}', { name: l.fileName })}
                type="number"
                min={1}
                max={1000}
                className="w-20"
                defaultValue={l.quantity}
                onBlur={(e) => {
                  const q = Number(e.target.value)
                  if (q >= 1 && q !== l.quantity)
                    router.post(`/cart/items/${l.id}`, { quantity: q })
                }}
              />
              {l.unitPriceMinor !== null && (
                <Money minor={l.unitPriceMinor} currency={currency} className="text-sm" />
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => router.post(`/cart/items/${l.id}/remove`)}
              >
                {t('Remove')}
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {currencies.length > 1 && (
        <div className="flex items-center gap-3 text-sm">
          <Label htmlFor="cart-currency">{t('Pay in')}</Label>
          <select
            id="cart-currency"
            className="h-9 rounded-md border border-line bg-paper-raised px-2"
            value={currency}
            onChange={(e) =>
              router.get(
                '/cart',
                { country, currency: e.target.value, coupon: coupon.trim() || undefined },
                { preserveState: true }
              )
            }
          >
            {currencies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      )}

      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          router.get('/cart', { country, currency, coupon: coupon.trim() || undefined })
        }}
      >
        <div className="space-y-1">
          <Label htmlFor="cart-coupon">{t('Coupon code')}</Label>
          <Input
            id="cart-coupon"
            value={coupon}
            className="w-48"
            autoComplete="off"
            onChange={(e) => setCoupon(e.target.value)}
          />
        </div>
        <Button type="submit" variant="outline">
          {t('Apply')}
        </Button>
      </form>
      {couponProblem && (
        <p role="alert" className="rounded-md bg-danger-soft p-3 text-sm text-danger">
          {t(couponProblem)}
        </p>
      )}

      {problem && <p className="rounded-md bg-danger-soft p-3 text-sm text-danger">{t(problem)}</p>}

      {totals && (
        <dl className="space-y-1 rounded-lg border border-line bg-paper-raised p-5 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-600">{t('Items')}</dt>
            <dd>
              <Money
                minor={totals.subtotalMinor + totals.discountMinor}
                currency={totals.currency}
              />
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-600">{t('Shipping to {country}', { country })}</dt>
            <dd>
              <Money minor={totals.shippingMinor} currency={totals.currency} />
            </dd>
          </div>
          {totals.discountMinor > 0 && (
            <div className="flex justify-between text-fil-700">
              <dt>{t('Coupon {code}', { code: couponCode.toUpperCase() })}</dt>
              <dd>
                −<Money minor={totals.discountMinor} currency={totals.currency} />
              </dd>
            </div>
          )}
          {eta && (
            <div className="flex justify-between">
              <dt className="text-ink-600">{t('Estimated delivery')}</dt>
              <dd>
                {formatDate(eta.earliest)} – {formatDate(eta.latest)}
              </dd>
            </div>
          )}
          <div className="flex justify-between border-t border-line pt-2 text-base font-semibold text-ink-900">
            <dt>{t('Total')}</dt>
            <dd>
              <Money minor={totals.totalMinor} currency={totals.currency} />
            </dd>
          </div>
          {totals.taxMinor > 0 && (
            <p className="text-xs text-ink-600">
              {t('Includes VAT {rate}%:', { rate: totals.taxRateBps / 100 })}{' '}
              <Money minor={totals.taxMinor} currency={totals.currency} />
            </p>
          )}
        </dl>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('Delivery address')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault()
              router.post(
                '/cart/checkout',
                {
                  shippingAddress: { ...address, phone: address.phone || undefined },
                  acceptTerms: accepted,
                  currency,
                  couponCode: totals && totals.discountMinor > 0 ? couponCode : undefined,
                },
                {
                  headers: idem.headers(),
                  onStart: () => setBusy(true),
                  onError: idem.renew,
                  onFinish: () => setBusy(false),
                }
              )
            }}
          >
            {(
              [
                ['fullName', t('Full name')],
                ['line1', t('Address')],
                ['city', t('City')],
                ['postalCode', t('Postal code')],
                ['phone', t('Phone (for the courier)')],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-1">
                <Label htmlFor={`a-${key}`}>{label}</Label>
                <Input
                  id={`a-${key}`}
                  required={key !== 'phone'}
                  value={address[key]}
                  onChange={(e) => set(key)(e.target.value)}
                />
                <FieldError name={`shippingAddress.${key}`} />
              </div>
            ))}
            <div className="space-y-1">
              <Label htmlFor="a-country">{t('Country (2 letters)')}</Label>
              <Input
                id="a-country"
                maxLength={2}
                value={address.country}
                onChange={(e) => set('country')(e.target.value.toUpperCase())}
                onBlur={() =>
                  // keep the chosen currency and coupon: only the delivery country changes
                  router.get(
                    '/cart',
                    { country: address.country, currency, coupon: coupon.trim() || undefined },
                    { preserveState: true, preserveScroll: true }
                  )
                }
              />
              <FieldError name="shippingAddress.country" />
            </div>
            <div className="space-y-3 sm:col-span-2">
              <TermsCheckbox checked={accepted} onChange={setAccepted} />
              <FormErrors />
              <Button
                type="submit"
                className="w-full"
                disabled={busy || !!problem || (needsTerms && !accepted)}
              >
                {busy ? t('Please wait…') : t('Continue to payment')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default CartPage
