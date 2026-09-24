import { useState } from 'react'
import { Head, router, usePage } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { ArrowLeft } from 'lucide-react'
import { TermsCheckbox, useLegalAcceptance } from '~/components/terms_checkbox'
import { useIdempotencyKey } from '~/lib/idempotency'
import { formatMoney } from '~/lib/format'
import { useT } from '~/lib/i18n'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'

type Product = {
  id: number
  slug: string
  title: string
  description: string | null
  materials: string[]
  fromPriceMinor: number
  currency: string
  bboxMm: number[] | null
  scales: number[]
  options: Array<{ material: string; scalePercent: number; unitPriceMinor: number }>
}

function ReportListing({ productId }: { productId: number }) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('weapon')
  return (
    <div className="mt-4 border-t border-line pt-3 text-center">
      {!open ? (
        <button
          type="button"
          className="text-xs text-ink-600 underline hover:text-ink-900"
          onClick={() => setOpen(true)}
        >
          {t('Report this listing')}
        </button>
      ) : (
        <form
          className="flex items-center justify-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            router.post(
              `/shop/${productId}/report`,
              { reason },
              { onSuccess: () => setOpen(false) }
            )
          }}
        >
          <select
            aria-label={t('Reason')}
            className="h-9 rounded-md border border-line bg-paper-raised px-2 text-sm"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            <option value="weapon">{t('Weapon or dangerous item')}</option>
            <option value="copyright">{t('Copyright / someone else’s design')}</option>
            <option value="unsafe">{t('Unsafe or illegal')}</option>
            <option value="other">{t('Something else')}</option>
          </select>
          <Button type="submit" size="sm" variant="outline">
            {t('Send report')}
          </Button>
        </form>
      )}
    </div>
  )
}

export default function ShopShow({
  product,
  canonicalUrl,
  jsonLd,
  reviews,
}: {
  product: Product
  canonicalUrl: string
  jsonLd: string
  reviews: {
    count: number
    average: number | null
    recent: Array<{ rating: number; comment: string | null; at: string }>
  }
}) {
  const { t } = useT()
  const { props } = usePage<{ user?: { id: number } | null }>()
  const idem = useIdempotencyKey()
  const needsTerms = useLegalAcceptance()
  const [accepted, setAccepted] = useState(false)
  const [material, setMaterial] = useState(product.options[0]?.material ?? '')
  const [scale, setScale] = useState(100)
  const [quantity, setQuantity] = useState(1)
  const [busy, setBusy] = useState(false)
  const [address, setAddress] = useState({
    fullName: '',
    line1: '',
    city: '',
    postalCode: '',
    country: 'TR',
  })

  const atScale = product.options.filter((o) => o.scalePercent === scale)
  const unit = atScale.find((o) => o.material === material)?.unitPriceMinor ?? 0
  const description =
    product.description ?? t('{title} — 3D printed on demand.', { title: product.title })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    router.post(
      `/shop/${product.id}/order`,
      { material, quantity, scalePercent: scale, shippingAddress: address, acceptTerms: accepted },
      { headers: idem.headers(), onError: idem.renew, onFinish: () => setBusy(false) }
    )
  }

  return (
    <>
      <Head title={product.title}>
        <meta name="description" content={description.slice(0, 160)} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={product.title} />
        <meta property="og:description" content={description.slice(0, 160)} />
        <meta property="og:type" content="product" />
        <meta property="og:url" content={canonicalUrl} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      </Head>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/shop"
          className="inline-flex items-center gap-1 text-sm text-ink-600 hover:text-ink-800"
        >
          <ArrowLeft className="h-4 w-4" /> {t('All products')}
        </Link>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="layer-lines flex h-72 items-end justify-between rounded-lg border border-line bg-paper-sunken p-6">
              <span className="font-display text-9xl font-semibold leading-none text-ink-900">
                {product.title.charAt(0)}
              </span>
              {product.bboxMm && (
                <span className="font-mono text-sm text-ink-700">
                  {t('{v2} mm', { v2: product.bboxMm.map((d) => Math.round(d)).join(' × ') })}
                </span>
              )}
            </div>
            <div>
              <h1 className="font-display text-3xl font-semibold text-ink-900">{product.title}</h1>
              {product.description && (
                <p className="mt-2 whitespace-pre-wrap text-ink-700">{product.description}</p>
              )}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('Order')}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="material">{t('Material')}</Label>
                    <select
                      id="material"
                      className="flex h-10 w-full rounded-md border border-line bg-paper-raised px-3 text-sm"
                      value={material}
                      onChange={(e) => setMaterial(e.target.value)}
                    >
                      {atScale.map((o) => (
                        <option key={o.material} value={o.material}>
                          {o.material} — {formatMoney(o.unitPriceMinor, product.currency)}
                        </option>
                      ))}
                    </select>
                  </div>
                  {product.scales.length > 1 && (
                    <div>
                      <Label htmlFor="scale">{t('Size')}</Label>
                      <select
                        id="scale"
                        className="flex h-10 w-full rounded-md border border-line bg-paper-raised px-3 text-sm"
                        value={scale}
                        onChange={(e) => setScale(Number(e.target.value))}
                      >
                        {product.scales.map((sc) => (
                          <option key={sc} value={sc}>
                            {sc === 100 ? t('Original size') : t('{sc}% of original', { sc })}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <Label htmlFor="quantity">{t('Quantity')}</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min={1}
                      max={100}
                      value={quantity}
                      onChange={(e) =>
                        setQuantity(Math.max(1, Number.parseInt(e.target.value, 10) || 1))
                      }
                    />
                  </div>
                </div>

                <p className="text-lg font-semibold text-ink-900">
                  {t('Total')}: {formatMoney(unit * quantity, product.currency)}
                </p>

                {props.user ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <Label htmlFor="fullName">{t('Full name')}</Label>
                        <Input
                          id="fullName"
                          required
                          value={address.fullName}
                          onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor="line1">{t('Address')}</Label>
                        <Input
                          id="line1"
                          required
                          value={address.line1}
                          onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="city">{t('City')}</Label>
                        <Input
                          id="city"
                          required
                          value={address.city}
                          onChange={(e) => setAddress({ ...address, city: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="postalCode">{t('Postal code')}</Label>
                        <Input
                          id="postalCode"
                          required
                          value={address.postalCode}
                          onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="country">{t('Country')}</Label>
                        <Input
                          id="country"
                          required
                          maxLength={2}
                          value={address.country}
                          onChange={(e) =>
                            setAddress({ ...address, country: e.target.value.toUpperCase() })
                          }
                        />
                      </div>
                    </div>
                    <TermsCheckbox checked={accepted} onChange={setAccepted} />
                    <Button
                      type="submit"
                      disabled={busy || !material || (needsTerms && !accepted)}
                      className="w-full"
                    >
                      {t('Continue to payment')}
                    </Button>
                  </>
                ) : (
                  <Link href="/login">
                    <Button type="button" className="w-full">
                      {t('Log in to order')}
                    </Button>
                  </Link>
                )}
                <p className="text-center text-xs text-ink-600">
                  {t('Your payment is held safely until your order is delivered.')}
                </p>
              </form>
              {props.user && <ReportListing productId={product.id} />}
            </CardContent>
          </Card>
        </div>
      </div>
      {reviews.count > 0 && (
        <section
          className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8"
          aria-labelledby="reviews-h"
        >
          <h2 id="reviews-h" className="font-display text-2xl font-semibold text-ink-900">
            {reviews.average?.toFixed(1)} / 5 ·{' '}
            {reviews.count === 1
              ? t('{count} review', { count: reviews.count })
              : t('{count} reviews', { count: reviews.count })}
          </h2>
          <ul className="mt-4 space-y-3">
            {reviews.recent.map((r) => (
              <li
                key={r.at + r.rating}
                className="rounded-lg border border-line bg-paper-raised p-4 text-sm"
              >
                <p className="font-medium text-ink-900">
                  <span aria-label={t('{rating} out of 5', { rating: r.rating })}>
                    {'★'.repeat(r.rating)}
                    {'☆'.repeat(5 - r.rating)}
                  </span>
                </p>
                {r.comment && <p className="mt-1 text-ink-700">{r.comment}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
