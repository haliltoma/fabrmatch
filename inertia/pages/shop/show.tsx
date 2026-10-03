import { useState } from 'react'
import { FieldError, FormErrors } from '~/components/field_error'
import { DeliveryNotice, type Delivery } from '~/components/delivery_notice'
import { ChargeNote } from '~/components/money'
import { router, usePage } from '@inertiajs/react'
import { Seo } from '~/components/seo'
import { Link } from '@adonisjs/inertia/react'
import { ArrowLeft, PackageCheck, Star } from 'lucide-react'
import { TermsCheckbox, useLegalAcceptance } from '~/components/terms_checkbox'
import { useIdempotencyKey } from '~/lib/idempotency'
import { formatPrice, formatPriceDelta } from '~/lib/format'
import { useT } from '~/lib/i18n'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { ProductGallery, type ShopImage } from '~/components/product_image'
import { PaintColourField, type PaintColour } from '~/components/paint_colour'
import { ColourPicker, type ChosenColour } from '~/components/colour_picker'

type Product = {
  id: string
  slug: string
  title: string
  description: string | null
  materials: string[]
  fromPriceMinor: number
  currency: string
  bboxMm: number[] | null
  images: ShopImage[]
  scales: number[]
  options: Array<{
    material: string
    scalePercent: number
    finishing: string | null
    /** how many filament colours this price is for (1 = single colour) */
    colourCount: number
    unitPriceMinor: number
  }>
  finishings: Array<{
    code: string
    name: string
    description: string
    extraDays: number
    materials: string[] | null
    needsColour: boolean
  }>
  paintColours: PaintColour[]
  /** every filament colour: the buyer chooses, the maker accepts or asks */
  colours: PaintColour[]
  maxColours: number
  productionDays: number
}

const MAX_QUANTITY = 100

function ReportListing({ productId }: { productId: string }) {
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

/** Five stars filled to the average (e.g. 4.3 → four and a third); the number next to it is the label. */
function Stars({ value }: { value: number }) {
  const { t } = useT()
  const row = (filled: boolean) => (
    <span className="flex w-max">
      {[0, 1, 2, 3, 4].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 shrink-0 ${filled ? 'fill-amber-ink text-amber-ink' : 'text-ink-300'}`}
          strokeWidth={1.75}
          aria-hidden
        />
      ))}
    </span>
  )
  return (
    <span
      className="relative inline-flex"
      role="img"
      aria-label={t('Rated {value} out of 5', { value: value.toFixed(1) })}
    >
      {row(false)}
      <span
        className="absolute inset-y-0 left-0 overflow-hidden"
        style={{ width: `${(value / 5) * 100}%` }}
      >
        {row(true)}
      </span>
    </span>
  )
}

export default function ShopShow({
  product,
  canonicalUrl,
  jsonLd,
  reviews,
  delivery,
  soldCount,
}: {
  product: Product
  /** paid orders of this listing, only sent once there are enough to be worth saying */
  soldCount: number | null
  canonicalUrl: string
  jsonLd: string
  delivery?: Delivery
  reviews: {
    count: number
    average: number | null
    recent: Array<{ rating: number; comment: string | null; at: string }>
  }
}) {
  const { t } = useT()
  const { props } = usePage<{ user?: { id: string } | null; siteUrl?: string }>()
  const idem = useIdempotencyKey()
  const needsTerms = useLegalAcceptance()
  const [accepted, setAccepted] = useState(false)
  const [material, setMaterial] = useState(product.options[0]?.material ?? '')
  // the buyer decides: nothing is picked for them
  const [colours, setColours] = useState<ChosenColour[]>([])
  const [buyerNote, setBuyerNote] = useState('')
  const [scale, setScale] = useState(product.scales.includes(100) ? 100 : product.scales[0])
  // the field may be empty while typing; the order always uses a whole number in 1…100
  const [quantityText, setQuantityText] = useState('1')
  const quantity = Math.min(MAX_QUANTITY, Math.max(1, Number.parseInt(quantityText, 10) || 1))
  const [busy, setBusy] = useState(false)
  const [coupon, setCoupon] = useState('')
  const [finishing, setFinishing] = useState('')
  const [paintColour, setPaintColour] = useState('')
  const [address, setAddress] = useState({
    fullName: '',
    line1: '',
    city: '',
    postalCode: '',
    // the price on the page is for this country: start the address there
    country: delivery?.country ?? 'TR',
    phone: '',
  })
  const cannotDeliver = !!delivery && !delivery.served
  // a different country means a different price: reprice the page for it
  const repriceFor = (country: string) => {
    if (!/^[A-Z]{2}$/.test(country) || country === delivery?.country) return
    router.get(
      window.location.pathname,
      { country },
      { preserveScroll: true, preserveState: true, replace: true }
    )
  }

  const colourCount = Math.max(1, colours.length)
  const priceOf = (m: string, f: string | null, n = colourCount) =>
    product.options.find(
      (o) =>
        o.material === m && o.scalePercent === scale && o.finishing === f && o.colourCount === n
    )?.unitPriceMinor ?? null
  const unit = priceOf(material, finishing || null) ?? 0
  // the breakdown: one colour, then what extra colours and the finishing add
  const plainUnit = priceOf(material, null, 1) ?? 0
  const colouredUnit = priceOf(material, null) ?? plainUnit
  const extraColourMinor = (priceOf(material, null, 2) ?? plainUnit) - plainUnit
  // every material that can be printed at this size, priced with the finishing already chosen
  const materials = product.options
    .filter((o) => o.scalePercent === scale && o.finishing === null && o.colourCount === 1)
    .map((o) => o.material)
  const finishingFits = (f: Product['finishings'][number]) =>
    (!f.materials || f.materials.map((m) => m.toUpperCase()).includes(material)) &&
    priceOf(material, f.code) !== null
  const chosenFinishing = product.finishings.find((f) => f.code === finishing) ?? null
  const missingColour = !!chosenFinishing?.needsColour && !paintColour
  const days = product.productionDays + (chosenFinishing?.extraDays ?? 0)
  // a disabled button always says why, next to it
  const blocker = cannotDeliver
    ? t('Change the country above to one where makers print to order.')
    : colours.length === 0
      ? t('Pick a colour to continue.')
      : missingColour
        ? t('Pick a paint colour to continue.')
        : needsTerms && !accepted
          ? t('Accept the terms to continue.')
          : null

  const pickMaterial = (next: string) => {
    setMaterial(next)
    const f = product.finishings.find((x) => x.code === finishing)
    if (f && priceOf(next, f.code) === null) setFinishing('')
  }
  const description =
    product.description ?? t('{title} — 3D printed on demand.', { title: product.title })
  // link previews want an absolute URL: a real photo first, else the hero render
  const cover = product.images[0] ?? null
  const ogImage = cover ? { ...cover, url: `${props.siteUrl ?? ''}${cover.url}` } : null

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    router.post(
      `/shop/${product.id}/order`,
      {
        material,
        colours: colours.map((c) => ({ name: c.name, part: c.part.trim() || undefined })),
        buyerNote: buyerNote.trim() || undefined,
        quantity,
        scalePercent: scale,
        shippingAddress: { ...address, phone: address.phone || undefined },
        acceptTerms: accepted,
        couponCode: coupon.trim() || undefined,
        finishing: finishing || undefined,
        finishingColour: chosenFinishing?.needsColour ? paintColour : undefined,
      },
      {
        headers: idem.headers(),
        // a refused note or coupon keeps the address and choices on the page
        preserveState: true,
        preserveScroll: true,
        onError: idem.renew,
        onFinish: () => setBusy(false),
      }
    )
  }

  return (
    <>
      <Seo
        title={product.title}
        description={description.slice(0, 160)}
        canonical={canonicalUrl}
        type="product"
        image={ogImage ? { ...ogImage, alt: product.title } : undefined}
        breadcrumbs={[{ name: t('Shop'), path: '/shop' }, { name: product.title }]}
      >
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      </Seo>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/shop"
          className="inline-flex items-center gap-1 text-sm text-ink-600 hover:text-ink-800"
        >
          <ArrowLeft className="h-4 w-4" /> {t('All products')}
        </Link>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <ProductGallery images={product.images} title={product.title} bboxMm={product.bboxMm} />
            <div>
              <h1 className="font-display text-3xl font-semibold text-ink-900">{product.title}</h1>
              {(reviews.count > 0 || soldCount !== null) && (
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-700">
                  {reviews.count > 0 && reviews.average !== null && (
                    <a
                      href="#reviews-h"
                      className="inline-flex items-center gap-1.5 hover:underline"
                    >
                      <Stars value={reviews.average} />
                      <span className="font-semibold text-ink-900">
                        {reviews.average.toFixed(1)}
                      </span>
                      <span>
                        (
                        {reviews.count === 1
                          ? t('{count} review', { count: reviews.count })
                          : t('{count} reviews', { count: reviews.count })}
                        )
                      </span>
                    </a>
                  )}
                  {soldCount !== null && (
                    <span className="inline-flex items-center gap-1.5">
                      <PackageCheck className="h-4 w-4 text-fil-600" aria-hidden />
                      {t('Ordered {count} times', { count: soldCount })}
                    </span>
                  )}
                </p>
              )}
              {product.description && (
                <p className="mt-2 whitespace-pre-wrap text-ink-700">{product.description}</p>
              )}
              <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-t border-line pt-4 text-sm">
                {product.bboxMm && (
                  <>
                    <dt className="text-ink-600">{t('Size')}</dt>
                    <dd className="font-mono text-ink-900">
                      {product.bboxMm.map((d) => Math.round((d * scale) / 100)).join(' × ')} mm
                    </dd>
                  </>
                )}
                <dt className="text-ink-600">{t('Materials')}</dt>
                <dd className="text-ink-900">{product.materials.join(', ')}</dd>
                <dt className="text-ink-600">{t('Ready in')}</dt>
                <dd className="text-ink-900">
                  {t('{n} days after a maker accepts, then shipped', { n: days })}
                </dd>
                <dt className="text-ink-600">{t('Printed by')}</dt>
                <dd className="text-ink-900">{t('A verified maker in your country')}</dd>
              </dl>
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
                      onChange={(e) => pickMaterial(e.target.value)}
                    >
                      {materials.map((m) => {
                        const price = priceOf(m, finishing || null) ?? priceOf(m, null)
                        return (
                          <option key={m} value={m}>
                            {m}
                            {price !== null && ` — ${formatPrice(price, product.currency)}`}
                          </option>
                        )
                      })}
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
                    <div className="flex h-10 items-stretch overflow-hidden rounded-md border border-line bg-paper-raised focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-heat-500">
                      <button
                        type="button"
                        className="w-11 shrink-0 text-lg text-ink-700 hover:bg-paper-sunken disabled:text-ink-300"
                        aria-label={t('One less')}
                        disabled={quantity <= 1}
                        onClick={() => setQuantityText(String(quantity - 1))}
                      >
                        −
                      </button>
                      <input
                        id="quantity"
                        inputMode="numeric"
                        aria-describedby="quantity-help"
                        className="tabular min-w-0 flex-1 border-x border-line bg-transparent text-center text-sm focus:outline-none"
                        value={quantityText}
                        onChange={(e) =>
                          setQuantityText(e.target.value.replace(/\D/g, '').slice(0, 3))
                        }
                        onBlur={() => setQuantityText(String(quantity))}
                      />
                      <button
                        type="button"
                        className="w-11 shrink-0 text-lg text-ink-700 hover:bg-paper-sunken disabled:text-ink-300"
                        aria-label={t('One more')}
                        disabled={quantity >= MAX_QUANTITY}
                        onClick={() => setQuantityText(String(quantity + 1))}
                      >
                        +
                      </button>
                    </div>
                    <p id="quantity-help" className="mt-1 text-xs text-ink-600">
                      {t('Up to {max} per order.', { max: MAX_QUANTITY })}
                    </p>
                  </div>
                </div>

                <ColourPicker
                  id="filament-colour"
                  colours={product.colours}
                  value={colours}
                  onChange={setColours}
                  max={product.maxColours}
                  extraNote={
                    extraColourMinor > 0
                      ? t('Each extra colour adds {price} per piece.', {
                          price: formatPrice(extraColourMinor, product.currency),
                        })
                      : undefined
                  }
                />

                {product.finishings.some(finishingFits) && (
                  <div className="space-y-1">
                    <Label htmlFor="finishing">{t('Finishing (optional)')}</Label>
                    <select
                      id="finishing"
                      className="flex h-10 w-full rounded-md border border-line bg-paper-raised px-3 text-sm"
                      value={finishing}
                      onChange={(e) => setFinishing(e.target.value)}
                    >
                      <option value="">{t('None — straight from the printer')}</option>
                      {product.finishings.filter(finishingFits).map((f) => (
                        <option key={f.code} value={f.code}>
                          {t(f.name)} ·{' '}
                          {formatPriceDelta(
                            (priceOf(material, f.code) ?? 0) - colouredUnit,
                            product.currency
                          )}{' '}
                          · {f.extraDays === 1 ? t('+1 day') : t('+{n} days', { n: f.extraDays })}
                        </option>
                      ))}
                    </select>
                    {chosenFinishing && (
                      <p className="text-xs text-ink-600">{t(chosenFinishing.description)}</p>
                    )}
                    {chosenFinishing?.needsColour && (
                      <div className="pt-2">
                        <PaintColourField
                          colours={product.paintColours}
                          value={paintColour}
                          onChange={setPaintColour}
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-1">
                  <Label htmlFor="buyer-note">{t('Note for the maker (optional)')}</Label>
                  <textarea
                    id="buyer-note"
                    rows={2}
                    maxLength={500}
                    value={buyerNote}
                    aria-describedby="buyer-note-help"
                    onChange={(e) => setBuyerNote(e.target.value)}
                    className="w-full rounded-md border border-line bg-paper-raised px-3 py-2 text-sm"
                  />
                  <p id="buyer-note-help" className="text-xs text-ink-600">
                    {t(
                      'Print details only. Phone numbers, links and company names are not sent: both sides stay anonymous.'
                    )}
                  </p>
                </div>

                <div className="space-y-1 border-t border-line pt-4" aria-live="polite">
                  <dl className="space-y-1 text-sm text-ink-700">
                    <div className="flex justify-between gap-3">
                      <dt>
                        {colours.length === 0
                          ? material
                          : t('{material}, {colour}', {
                              material,
                              colour: colours.map((c) => t(c.name)).join(' + '),
                            })}
                      </dt>
                      <dd className="tabular">{formatPrice(plainUnit, product.currency)}</dd>
                    </div>
                    {colours.length > 1 && (
                      <div className="flex justify-between gap-3">
                        <dt>{t('{n} colours', { n: colours.length })}</dt>
                        <dd className="tabular">
                          {formatPriceDelta(colouredUnit - plainUnit, product.currency)}
                        </dd>
                      </div>
                    )}
                    {chosenFinishing && (
                      <div className="flex justify-between gap-3">
                        <dt>
                          {t(chosenFinishing.name)}
                          {paintColour && chosenFinishing.needsColour && ` (${t(paintColour)})`}
                        </dt>
                        <dd className="tabular">
                          {formatPriceDelta(unit - colouredUnit, product.currency)}
                        </dd>
                      </div>
                    )}
                    {quantity > 1 && (
                      <div className="flex justify-between gap-3">
                        <dt>{t('Quantity')}</dt>
                        <dd className="tabular">× {quantity}</dd>
                      </div>
                    )}
                  </dl>
                  <p className="flex items-baseline justify-between gap-3 pt-1 text-ink-900">
                    <span className="text-sm font-medium">{t('Total')}</span>
                    <span className="tabular font-display text-2xl font-semibold">
                      {formatPrice(unit * quantity, product.currency)}
                    </span>
                  </p>
                </div>
                <ChargeNote />
                <DeliveryNotice delivery={delivery} />
                <p className="text-xs text-ink-600">
                  {t('Made within {n} days of a maker accepting it, then shipped.', { n: days })}
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
                        <FieldError name="shippingAddress.fullName" />
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor="line1">{t('Address')}</Label>
                        <Input
                          id="line1"
                          required
                          value={address.line1}
                          onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                        />
                        <FieldError name="shippingAddress.line1" />
                      </div>
                      <div>
                        <Label htmlFor="city">{t('City')}</Label>
                        <Input
                          id="city"
                          required
                          value={address.city}
                          onChange={(e) => setAddress({ ...address, city: e.target.value })}
                        />
                        <FieldError name="shippingAddress.city" />
                      </div>
                      <div>
                        <Label htmlFor="postalCode">{t('Postal code')}</Label>
                        <Input
                          id="postalCode"
                          required
                          value={address.postalCode}
                          onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                        />
                        <FieldError name="shippingAddress.postalCode" />
                      </div>
                      <div>
                        <Label htmlFor="country">{t('Country')}</Label>
                        <Input
                          id="country"
                          required
                          maxLength={2}
                          value={address.country}
                          aria-describedby="country-help"
                          onChange={(e) =>
                            setAddress({ ...address, country: e.target.value.toUpperCase() })
                          }
                          onBlur={(e) => repriceFor(e.target.value.toUpperCase())}
                        />
                        <p id="country-help" className="mt-1 text-xs text-ink-600">
                          {t('Two letters, like TR or DE. The price updates for it.')}
                        </p>
                        <FieldError name="shippingAddress.country" />
                      </div>
                      <div>
                        <Label htmlFor="phone">{t('Phone (for the courier)')}</Label>
                        <Input
                          id="phone"
                          type="tel"
                          autoComplete="tel"
                          value={address.phone}
                          onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                        />
                      </div>
                    </div>
                    <details className="group text-sm" open={coupon !== ''}>
                      <summary className="cursor-pointer text-ink-700 underline-offset-2 hover:underline">
                        {t('Have a coupon code?')}
                      </summary>
                      <div className="mt-2 space-y-1">
                        <Label htmlFor="shop-coupon">{t('Coupon code')}</Label>
                        <Input
                          id="shop-coupon"
                          value={coupon}
                          maxLength={40}
                          autoComplete="off"
                          onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                        />
                        <p className="text-xs text-ink-600">
                          {t('The discount shows on the next page, before you pay.')}
                        </p>
                      </div>
                    </details>
                    <TermsCheckbox checked={accepted} onChange={setAccepted} />
                    <FormErrors />
                    <Button
                      type="submit"
                      disabled={busy || !material || blocker !== null}
                      aria-describedby={blocker ? 'order-blocker' : undefined}
                      className="w-full"
                    >
                      {busy ? t('Please wait…') : t('Continue to payment')}
                    </Button>
                    {blocker && (
                      <p id="order-blocker" className="text-center text-xs text-ink-600">
                        {blocker}
                      </p>
                    )}
                  </>
                ) : (
                  <Link href="/login" className="block">
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
          className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 lg:px-8"
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
