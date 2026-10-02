import { useState } from 'react'
import { FormErrors } from '~/components/field_error'
import { ChargeNote } from '~/components/money'
import { router } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Label } from '~/components/ui/label'
import { Input } from '~/components/ui/input'
import { ArrowLeft, Calculator, Loader2, Package } from 'lucide-react'
import { postJson } from '~/lib/api'
import { TermsCheckbox, useLegalAcceptance } from '~/components/terms_checkbox'
import { useIdempotencyKey } from '~/lib/idempotency'
import { formatDate, formatMoney, formatNumber, formatPrice } from '~/lib/format'
import { useT } from '~/lib/i18n'
import { PaintColourField, type PaintColour } from '~/components/paint_colour'

type FileInfo = {
  id: string
  originalName: string
  format: string
  volumeMm3: number
  bboxXMm: number | null
  bboxYMm: number | null
  bboxZMm: number | null
  triangleCount: number | null
  isPrintable: boolean | null
  dfmIssues: Array<{ code: string; level: 'info' | 'warning' | 'blocker'; message: string }>
}

type MaterialOption = {
  key: string
  label: string
  pricePerGramMinor: number
  technology: string | null
}

/** Per unit unless named total; the same pricing as the order (Paket V: the makers' market). */
type PriceBreakdown = {
  estGrams: number
  manufacturerShareMinor: number
  finishingMinor: number
  platformCommissionMinor: number
  shippingMinor: number
  unitPriceMinor: number
  totalPriceMinor: number
  currency: string
  /** what the order comes to with the cheaper and the dearer makers (total, delivered) */
  range: { lowMinor: number; highMinor: number; makers: number }
}

function QuotePage({
  file,
  error,
  materials,
  profiles,
  finishings,
  paintColours,
  newerVersionId,
  defaultCountry,
}: {
  file: FileInfo | null
  error: string | null
  materials: MaterialOption[]
  profiles: Array<{ id: string; name: string; technology: string; postProcess: string | null }>
  newerVersionId: string | null
  finishings: Array<{
    code: string
    name: string
    description: string
    priceMinor: number
    materials: string[] | null
    needsColour: boolean
  }>
  paintColours: PaintColour[]
  /** the visitor's likely delivery country (review fix 6) */
  defaultCountry?: string
}) {
  const { t } = useT()

  const [eta, setEta] = useState<{ earliest: string; latest: string } | null>(null)
  const [profileId, setProfileId] = useState<string | null>(null)
  const chosenTechnology = profiles.find((p) => p.id === profileId)?.technology
  const visibleMaterials = chosenTechnology
    ? materials.filter((m) => m.technology === chosenTechnology)
    : materials
  const [material, setMaterial] = useState(materials[0]?.key || 'PLA')
  const [quantity, setQuantity] = useState(1)
  const [finishing, setFinishing] = useState('')
  const fitting = finishings.filter((f) => !f.materials || f.materials.includes(material))
  const finishingCode = fitting.some((f) => f.code === finishing) ? finishing : ''
  const [paintColour, setPaintColour] = useState('')
  const needsColour = !!fitting.find((f) => f.code === finishingCode)?.needsColour
  const finishingColour = needsColour ? paintColour || undefined : undefined
  const missingColour = needsColour && !paintColour
  const [infill, setInfill] = useState(0.2)
  const [breakdown, setBreakdown] = useState<PriceBreakdown | null>(null)
  const [loading, setLoading] = useState(false)
  const [calcError, setCalcError] = useState<string | null>(null)
  // the inputs the shown price was calculated for: any change makes it stale (review fix 8)
  const [pricedFor, setPricedFor] = useState<string | null>(null)
  const [address, setAddress] = useState({
    fullName: '',
    line1: '',
    line2: '',
    district: '',
    city: '',
    postalCode: '',
    country: defaultCountry ?? 'TR',
    phone: '',
  })
  const quoteInputs = JSON.stringify([
    material,
    quantity,
    infill,
    profileId,
    finishingCode,
    address.country,
  ])
  const stale = breakdown !== null && pricedFor !== quoteInputs
  const idem = useIdempotencyKey()
  const needsTerms = useLegalAcceptance()
  const [accepted, setAccepted] = useState(false)
  const [ordering, setOrdering] = useState(false)
  const addToCart = () =>
    router.post('/cart/items', {
      modelFileId: file!.id,
      material,
      quantity,
      infill,
      printProfileId: profileId ?? undefined,
      finishing: finishingCode || undefined,
      finishingColour,
    })

  if (!file || error) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <Link
          href="/files"
          className="inline-flex items-center gap-1 text-sm text-ink-600 hover:text-ink-800"
        >
          <ArrowLeft className="h-4 w-4" /> {t('Back to files')}
        </Link>
        <Card>
          <CardContent className="py-12 text-center text-ink-600">
            {error || 'File not found or not yet analyzed.'}
          </CardContent>
        </Card>
      </div>
    )
  }

  const newerBanner = newerVersionId ? (
    <p role="note" className="rounded-md bg-amber-soft p-3 text-sm text-amber-ink">
      {t('You uploaded a newer version of this model.')}{' '}
      <Link href={`/files/${newerVersionId}/quote`} className="font-medium underline">
        {t('Get a price for the newest version')}
      </Link>
    </p>
  ) : null

  const calculate = async () => {
    setLoading(true)
    setCalcError(null)
    try {
      const data = await postJson<{
        breakdown: PriceBreakdown
        eta: { earliest: string; latest: string } | null
      }>(`/files/${file.id}/quote`, {
        material,
        quantity,
        infill,
        printProfileId: profileId ?? undefined,
        finishing: finishingCode || undefined,
        country: address.country,
      })
      setBreakdown(data.breakdown)
      setEta(data.eta)
      setPricedFor(quoteInputs)
    } catch (err) {
      setCalcError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const placeOrder = (e: React.FormEvent) => {
    e.preventDefault()
    if (stale) return
    setOrdering(true)
    router.post(
      '/orders',
      {
        modelFileId: file.id,
        material,
        quantity,
        infill,
        printProfileId: profileId ?? undefined,
        finishing: finishingCode || undefined,
        finishingColour,
        acceptTerms: accepted,
        shippingAddress: {
          fullName: address.fullName,
          line1: address.line1,
          line2: address.line2 || undefined,
          district: address.district || undefined,
          city: address.city,
          postalCode: address.postalCode,
          country: address.country,
          phone: address.phone || undefined,
        },
      },
      { headers: idem.headers(), onError: idem.renew, onFinish: () => setOrdering(false) }
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <Link
        href="/files"
        className="inline-flex items-center gap-1 text-sm text-ink-600 hover:text-ink-800"
      >
        <ArrowLeft className="h-4 w-4" /> {t('Back to files')}
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">{t('Price Quote')}</h1>
        <p className="text-ink-600">{file.originalName}</p>
      </div>
      {newerBanner}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('Model Info')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-ink-600">{t('Volume:')}</span>{' '}
              <span className="font-medium">
                {t('{v1} mm³', { v1: file.volumeMm3.toFixed(1) })}
              </span>
            </div>
            {file.bboxXMm !== null && file.bboxYMm !== null && file.bboxZMm !== null && (
              <div>
                <span className="text-ink-600">{t('Bounding box:')}</span>{' '}
                <span className="font-medium">
                  {t('{v2} x {v4} x {v6} mm', {
                    v2: file.bboxXMm.toFixed(1),
                    v4: file.bboxYMm.toFixed(1),
                    v6: file.bboxZMm.toFixed(1),
                  })}
                </span>
              </div>
            )}
            {file.triangleCount !== null && (
              <div>
                <span className="text-ink-600">{t('Triangles:')}</span>{' '}
                <span className="font-medium">{formatNumber(file.triangleCount)}</span>
              </div>
            )}
            <div>
              <span className="text-ink-600">{t('Printable:')}</span>{' '}
              <span className={`font-medium ${file.isPrintable ? 'text-fil-700' : 'text-danger'}`}>
                {file.isPrintable ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
          {file.dfmIssues.length > 0 && (
            <ul className="mt-4 space-y-2" aria-label={t('Print checks')}>
              {file.dfmIssues.map((issue) => (
                <li
                  key={issue.code}
                  className={`rounded-md border px-3 py-2 text-sm ${
                    issue.level === 'blocker'
                      ? 'border-danger/40 bg-danger-soft text-danger'
                      : issue.level === 'warning'
                        ? 'border-amber-ink/30 bg-amber-soft text-amber-ink'
                        : 'border-line bg-paper-sunken text-ink-700'
                  }`}
                >
                  <span className="font-medium">
                    {issue.level === 'blocker'
                      ? t('Must fix: ')
                      : issue.level === 'warning'
                        ? t('Check: ')
                        : t('Note: ')}
                  </span>
                  {t(issue.message)}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('Configure')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="material">{t('Material')}</Label>
            <select
              id="material"
              className="flex h-10 w-full rounded-md border border-line bg-paper-raised px-3 py-2 text-sm"
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
            >
              {visibleMaterials.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label} ({formatPrice(m.pricePerGramMinor)}/g)
                </option>
              ))}
            </select>
          </div>

          {profiles.length > 0 && (
            <div>
              <Label htmlFor="profile">{t('Print quality')}</Label>
              <select
                id="profile"
                className="flex h-10 w-full rounded-md border border-line bg-paper-raised px-3 py-2 text-sm"
                value={profileId ?? ''}
                onChange={(e) => {
                  const next = e.target.value || null
                  setProfileId(next)
                  const tech = profiles.find((p) => p.id === next)?.technology
                  const fits = materials.filter((m) => !tech || m.technology === tech)
                  if (!fits.some((m) => m.key === material) && fits[0]) setMaterial(fits[0].key)
                }}
              >
                <option value="">{t('Custom (choose infill)')}</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.technology} · {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {fitting.length > 0 && (
            <div>
              <Label htmlFor="finishing">{t('Finishing')}</Label>
              <select
                id="finishing"
                className="flex h-10 w-full rounded-md border border-line bg-paper-raised px-3 py-2 text-sm"
                value={finishingCode}
                onChange={(e) => setFinishing(e.target.value)}
              >
                <option value="">{t('None (as printed)')}</option>
                {fitting.map((f) => (
                  <option key={f.code} value={f.code}>
                    {f.name} · {t('+{amount} each', { amount: formatPrice(f.priceMinor, 'TRY') })}
                  </option>
                ))}
              </select>
              {finishingCode && (
                <p className="mt-1 text-xs text-ink-600">
                  {t(fitting.find((f) => f.code === finishingCode)?.description ?? '')}
                </p>
              )}
              {needsColour && (
                <div className="mt-3">
                  <PaintColourField
                    colours={paintColours}
                    value={paintColour}
                    onChange={setPaintColour}
                  />
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantity">{t('Quantity')}</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                max={1000}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number.parseInt(e.target.value) || 1))}
              />
            </div>
            <div className={profileId === null ? '' : 'hidden'}>
              <Label htmlFor="infill">
                {t('Infill ({v2}%)', { v2: Math.round(infill * 100) })}
              </Label>
              <input
                id="infill"
                type="range"
                min={0.05}
                max={1}
                step={0.05}
                value={infill}
                onChange={(e) => setInfill(Number.parseFloat(e.target.value))}
                className="mt-3 w-full"
              />
            </div>
          </div>

          <Button onClick={calculate} disabled={loading} className="w-full">
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Calculator className="mr-2 h-4 w-4" />
            )}
            {t('Calculate Price')}
          </Button>
          <Button variant="outline" onClick={addToCart} disabled={missingColour} className="w-full">
            {t('Add to cart')}
          </Button>

          {calcError && (
            <div className="rounded-md bg-danger-soft p-3 text-sm text-danger">{t(calcError)}</div>
          )}
        </CardContent>
      </Card>

      {breakdown && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('Price Breakdown')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-ink-600">
                <span>{t('Estimated weight')}</span>
                <span>{breakdown.estGrams.toFixed(2)} g</span>
              </div>
              {breakdown.finishingMinor > 0 && (
                <div className="flex justify-between text-ink-600">
                  <span>{t('Finishing')}</span>
                  <span>{formatPrice(breakdown.finishingMinor, breakdown.currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-ink-600">
                <span>{t('Maker, for material and print time')}</span>
                <span>{formatPrice(breakdown.manufacturerShareMinor, breakdown.currency)}</span>
              </div>
              <div className="flex justify-between text-ink-600">
                <span>{t('Platform commission')}</span>
                <span>{formatPrice(breakdown.platformCommissionMinor, breakdown.currency)}</span>
              </div>
              <div className="flex justify-between text-ink-600">
                <span>{t('Shipping (est.)')}</span>
                <span>{formatPrice(breakdown.shippingMinor, breakdown.currency)}</span>
              </div>
              <div className="border-t border-line pt-2" />
              <div className="flex justify-between font-medium">
                <span>{t('Unit price')}</span>
                <span>{formatPrice(breakdown.unitPriceMinor, breakdown.currency)}</span>
              </div>
              <div className="flex justify-between text-ink-600">
                <span>{t('Estimated delivery')}</span>
                <span>
                  {eta
                    ? `${formatDate(eta.earliest)} – ${formatDate(eta.latest)}`
                    : t('Confirmed once a maker accepts')}
                </span>
              </div>
              {breakdown.totalPriceMinor !== breakdown.unitPriceMinor && (
                <div className="flex justify-between text-lg font-bold text-ink-900">
                  <span>{t('Total ({quantity} pcs)', { quantity })}</span>
                  <span>{formatPrice(breakdown.totalPriceMinor, breakdown.currency)}</span>
                </div>
              )}
              <p className="text-xs text-ink-600">
                {breakdown.range.makers >= 3
                  ? t(
                      'Depending on the maker, this order comes to {low} to {high}. Your price pays most of them, so it is taken quickly.',
                      {
                        low: formatPrice(breakdown.range.lowMinor, breakdown.currency),
                        high: formatPrice(breakdown.range.highMinor, breakdown.currency),
                      }
                    )
                  : t(
                      'Priced at our reference maker until enough makers print this nearby. This is the price you pay.'
                    )}
              </p>
              <ChargeNote />
            </div>
          </CardContent>
        </Card>
      )}

      {file.isPrintable && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4" /> {t('Place Order')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!breakdown ? (
              <p className="text-sm text-ink-600">
                {t('Calculate the price first, then place your order below.')}
              </p>
            ) : (
              <form onSubmit={placeOrder} className="space-y-4">
                {stale && (
                  <p role="status" className="rounded-md bg-amber-soft p-3 text-sm text-amber-ink">
                    {t(
                      'You changed the options or the country since the price was calculated. Calculate the price again before ordering.'
                    )}
                  </p>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="fullName">{t('Full name')}</Label>
                    <Input
                      id="fullName"
                      required
                      value={address.fullName}
                      onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="country">{t('Country (2 letters)')}</Label>
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
                  <div className="sm:col-span-2">
                    <Label htmlFor="line1">{t('Address line 1')}</Label>
                    <Input
                      id="line1"
                      required
                      value={address.line1}
                      onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="line2">{t('Address line 2 (optional)')}</Label>
                    <Input
                      id="line2"
                      value={address.line2}
                      onChange={(e) => setAddress({ ...address, line2: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="district">{t('District (optional)')}</Label>
                    <Input
                      id="district"
                      value={address.district}
                      onChange={(e) => setAddress({ ...address, district: e.target.value })}
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

                <TermsCheckbox checked={accepted} onChange={setAccepted} />
                <FormErrors />
                <Button
                  type="submit"
                  disabled={ordering || stale || missingColour || (needsTerms && !accepted)}
                  className="w-full"
                >
                  {ordering ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Package className="mr-2 h-4 w-4" />
                  )}
                  {/* what will be charged, in its own currency — not the ≈ browse estimate */}
                  {t('Order — {total}', {
                    total: formatMoney(breakdown.totalPriceMinor, breakdown.currency),
                  })}
                </Button>
                <p className="text-center text-xs text-ink-600">
                  {t(
                    "You'll pay after reviewing the order. Your address is only shared with the manufacturer producing your order."
                  )}
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default QuotePage
