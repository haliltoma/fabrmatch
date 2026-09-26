import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Head } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import {
  ArrowRight,
  Box,
  Clock,
  FileUp,
  Loader2,
  Ruler,
  ShieldCheck,
  Sparkles,
  Trash2,
  Weight,
} from 'lucide-react'
import { postForm } from '~/lib/api'
import { Button } from '~/components/ui/button'
import { CountUp } from '~/components/count_up'
import { PrintArt } from '~/components/print_art'
import { ScanPanel, type ScanCheck } from '~/components/scan_panel'
import { formatMoney } from '~/lib/format'
import { useT } from '~/lib/i18n'

const StlViewer = lazy(() => import('~/components/stl_viewer'))

type Option = {
  material: string
  label: string
  grams: number
  printMinutes: number
  partMinor: number
  makerMinor: number
  platformMinor: number
  totals: Array<{ quantity: number; totalMinor: number; shippingMinor: number }>
}
type Quote = {
  volumeCm3: number
  bboxMm: [number, number, number]
  currency: string
  warnings: string[]
  options: Option[]
  security: { checks: ScanCheck[]; engine: 'signatures' | 'clamav' }
}

const MAX_BYTES = 15 * 1024 * 1024
const SAMPLE_URL = '/samples/sample-vase.stl'

/** What each FDM material is for, in general terms (not a claim about any maker). */
const MATERIAL_LOOK: Record<string, { swatch: string; tile: string; note: string }> = {
  PLA: { swatch: '#f0501e', tile: 'bg-sun', note: 'Everyday parts and decor. Crisp detail.' },
  PETG: { swatch: '#2f7d8b', tile: 'bg-sky', note: 'Tougher. Handles water and outdoor use.' },
  ABS: { swatch: '#15181c', tile: 'bg-blush', note: 'Takes heat and can be sanded smooth.' },
  TPU: { swatch: '#2f7d5b', tile: 'bg-lime', note: 'Flexible and rubbery. Grips and bends.' },
}

function hours(minutes: number) {
  return minutes < 60 ? `${minutes} min` : `${(minutes / 60).toFixed(1)} h`
}

function QuickQuote({ materials }: { materials: Array<{ key: string; label: string }> }) {
  const { t } = useT()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [material, setMaterial] = useState(materials[0]?.key ?? 'PLA')
  const [quantity, setQuantity] = useState(1)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [blocked, setBlocked] = useState<string | null>(null)

  useEffect(() => {
    if (!previewUrl) return
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  function choose(next: File | null) {
    setError(null)
    setBlocked(null)
    setQuote(null)
    if (!next) return
    if (!/\.(stl|3mf|obj)$/i.test(next.name)) {
      setError('Choose an STL, 3MF or OBJ file.')
      return
    }
    if (next.size > MAX_BYTES) {
      setError('This file is over 15 MB. Sign in to upload larger models.')
      return
    }
    setFile(next)
    // local preview only: the file never leaves the browser except for the one price request
    setPreviewUrl(URL.createObjectURL(next))
  }

  async function price(target: File | null = file) {
    if (!target) return
    setBusy(true)
    setError(null)
    setBlocked(null)
    try {
      const form = new FormData()
      form.append('material', material)
      form.append('model', target)
      const data = await postForm<{ quote: Quote }>('/tools/quick-quote', form)
      setQuote(data.quote)
    } catch (err) {
      const failure = err as Error & { blocked?: boolean }
      if (failure.blocked) setBlocked(failure.message)
      else setError(failure.message)
    } finally {
      setBusy(false)
    }
  }

  async function trySample() {
    const blob = await fetch(SAMPLE_URL).then((r) => r.blob())
    const sample = new File([blob], 'sample-vase.stl', { type: 'model/stl' })
    choose(sample)
    await price(sample)
  }

  const option = quote?.options.find((o) => o.material === material) ?? null
  const line = option?.totals.find((x) => x.quantity === quantity) ?? option?.totals[0]
  const single = option?.totals[0]
  const perPiece = line ? Math.round(line.totalMinor / line.quantity) : 0
  const saving = single && line && line.quantity > 1 ? single.totalMinor - perPiece : 0

  const parts = useMemo(() => {
    if (!option || !line) return []
    const q = line.quantity
    return [
      {
        label: t('Maker, for material and print time'),
        minor: option.makerMinor * q,
        color: 'bg-fil-600',
      },
      { label: t('Fabrmatch fee'), minor: option.platformMinor * q, color: 'bg-sky' },
      { label: t('Delivery in Türkiye'), minor: line.shippingMinor, color: 'bg-sun' },
    ]
  }, [option, line, t])
  const partsTotal = parts.reduce((s, p) => s + p.minor, 0) || 1

  return (
    <>
      <Head title={t('Instant 3D print price — upload an STL, no account')}>
        <meta
          name="description"
          content={t(
            'Upload an STL and see an estimated price for a 3D print delivered in Türkiye. No account. Your file is not stored.'
          )}
        />
      </Head>

      <section className="layer-lines border-b border-line">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <h1 className="max-w-3xl font-display text-4xl font-semibold leading-tight text-ink-900 sm:text-5xl">
            {t('What would this print cost?')}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-700">
            {t(
              'Drop in an STL. We measure it, price it in four materials, and forget the file — it is never stored or shared.'
            )}
          </p>
          <ol className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-ink-900">
            {[t('Drop your file'), t('Pick a material'), t('See the price')].map((label, i) => (
              <li key={label} className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-ink-900 bg-lime text-xs">
                  {i + 1}
                </span>
                {label}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl items-start gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:px-8">
        {/* left: file, material, quantity */}
        <div className="space-y-6">
          <section aria-labelledby="qq-file-h" className="space-y-3">
            <h2 id="qq-file-h" className="font-display text-xl font-semibold text-ink-900">
              {t('Your model')}
            </h2>
            {previewUrl && file ? (
              <div className="overflow-hidden rounded-[12px] border-2 border-ink-900 bg-paper-raised">
                <Suspense
                  fallback={
                    <div className="flex h-64 items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-ink-600" aria-hidden />
                    </div>
                  }
                >
                  {/\.stl$/i.test(file.name) ? (
                    <StlViewer url={previewUrl} className="h-64" />
                  ) : (
                    <div className="layer-lines flex h-64 items-center justify-center px-6 text-center text-sm text-ink-700">
                      {t(
                        'The 3D preview shows STL files. Your price is worked out from the full model.'
                      )}
                    </div>
                  )}
                </Suspense>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink-900 px-4 py-3">
                  <p className="min-w-0 truncate text-sm font-medium text-ink-900">
                    {file.name}{' '}
                    <span className="font-normal text-ink-600">
                      ·{' '}
                      {file.size < 1024 * 1024
                        ? `${Math.max(1, Math.round(file.size / 1024))} KB`
                        : `${(file.size / 1024 / 1024).toFixed(1)} MB`}
                    </span>
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setFile(null)
                      setPreviewUrl(null)
                      setQuote(null)
                    }}
                  >
                    <Trash2 aria-hidden /> {t('Change file')}
                  </Button>
                </div>
              </div>
            ) : (
              <label
                htmlFor="qq-file"
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragging(false)
                  choose(e.dataTransfer.files?.[0] ?? null)
                }}
                className={`flex cursor-pointer flex-col items-center gap-3 rounded-[12px] border-2 border-dashed px-6 py-12 text-center transition-colors ${
                  dragging
                    ? 'border-ink-900 bg-lime/40'
                    : 'border-ink-900/40 bg-paper-raised hover:border-ink-900 hover:bg-lime/15'
                }`}
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-lg border-2 border-ink-900 bg-lime shadow-[3px_3px_0_#15181c]">
                  <FileUp className="h-7 w-7 text-ink-900" aria-hidden />
                </span>
                <span className="font-display text-xl font-semibold text-ink-900">
                  {t('Drop an STL, 3MF or OBJ here or choose a file')}
                </span>
                <span className="text-sm text-ink-600">
                  {t('Up to 15 MB · stays in your browser')}
                </span>
                <input
                  ref={inputRef}
                  id="qq-file"
                  type="file"
                  accept=".stl,.3mf,.obj"
                  className="sr-only"
                  onChange={(e) => choose(e.target.files?.[0] ?? null)}
                />
              </label>
            )}
            {!file && (
              <p className="text-sm text-ink-700">
                {t('No file at hand?')}{' '}
                <button
                  type="button"
                  onClick={trySample}
                  disabled={busy}
                  className="font-semibold text-ink-900 underline underline-offset-4 hover:no-underline"
                >
                  {t('Try it with our sample vase')}
                </button>
              </p>
            )}
          </section>

          <fieldset className="space-y-3">
            <legend className="font-display text-xl font-semibold text-ink-900">
              {t('Material')}
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {materials.map((m) => {
                const look = MATERIAL_LOOK[m.key]
                const opt = quote?.options.find((o) => o.material === m.key)
                const tot = opt?.totals.find((x) => x.quantity === quantity)
                const active = material === m.key
                return (
                  <label
                    key={m.key}
                    className={`flex cursor-pointer gap-3 rounded-[12px] border-2 p-3 transition-transform duration-150 motion-reduce:transition-none ${
                      active
                        ? 'border-ink-900 bg-paper-raised shadow-[4px_4px_0_#15181c]'
                        : 'border-ink-900/20 bg-paper-raised hover:-translate-y-0.5 hover:border-ink-900'
                    }`}
                  >
                    <input
                      type="radio"
                      name="material"
                      value={m.key}
                      checked={active}
                      onChange={() => setMaterial(m.key)}
                      className="sr-only"
                    />
                    <span
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-md border-2 border-ink-900 ${look?.tile ?? 'bg-sun'}`}
                    >
                      <PrintArt
                        kind="vase"
                        color={look?.swatch ?? '#f0501e'}
                        className="h-11 w-11"
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="font-semibold text-ink-900">{m.label}</span>
                        {tot && (
                          <span className="tabular text-sm font-semibold text-ink-900">
                            {formatMoney(tot.totalMinor, quote!.currency)}
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-sm text-ink-700">
                        {t(look?.note ?? '')}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="font-display text-xl font-semibold text-ink-900">
              {t('How many?')}
            </legend>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 5, 10].map((q) => (
                <label
                  key={q}
                  className={`flex h-11 min-w-14 cursor-pointer items-center justify-center rounded-md border-2 px-4 font-semibold ${
                    quantity === q
                      ? 'border-ink-900 border-b-4 bg-lime text-ink-900'
                      : 'border-ink-900/25 bg-paper-raised text-ink-800 hover:border-ink-900'
                  }`}
                >
                  <input
                    type="radio"
                    name="quantity"
                    value={q}
                    checked={quantity === q}
                    onChange={() => setQuantity(q)}
                    className="sr-only"
                  />
                  {q}
                </label>
              ))}
            </div>
            <p className="text-sm text-ink-600">
              {t('Pieces ship together in one parcel, so delivery is shared.')}
            </p>
          </fieldset>

          {!quote && (
            <Button
              type="button"
              size="lg"
              variant="accent"
              className="w-full"
              disabled={!file || busy}
              onClick={() => price()}
            >
              {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
              {busy ? t('Measuring your model…') : t('Get the price')}
            </Button>
          )}
          {(busy || quote || blocked) && (
            <ScanPanel
              state={busy ? 'scanning' : blocked ? 'blocked' : 'clean'}
              checks={quote?.security.checks}
              reason={blocked}
            />
          )}
          {error && (
            <p
              role="alert"
              className="rounded-md border-2 border-danger/40 bg-danger-soft p-3 text-sm text-danger"
            >
              {t(error)}
            </p>
          )}
        </div>

        {/* right: the result, kept in view while options change */}
        <aside aria-live="polite" className="lg:sticky lg:top-24">
          {quote && option && line ? (
            <div className="overflow-hidden rounded-[14px] border-2 border-ink-900 bg-paper-raised shadow-[6px_6px_0_#15181c]">
              <div className="palette-light layer-lines-light bg-ink-900 p-6 text-paper">
                <p className="text-sm text-ink-200">
                  {t('{n} × {material}, delivered in Türkiye', {
                    n: line.quantity,
                    material: option.label,
                  })}
                </p>
                <p className="mt-1 font-display text-6xl font-semibold tabular-nums text-lime">
                  <CountUp value={line.totalMinor} format={(m) => formatMoney(m, quote.currency)} />
                </p>
                <p className="mt-2 text-sm text-ink-200">
                  {t('{amount} per piece', { amount: formatMoney(perPiece, quote.currency) })}
                  {saving > 0 &&
                    ` · ${t('{amount} less per piece than ordering one', {
                      amount: formatMoney(saving, quote.currency),
                    })}`}
                </p>
              </div>

              <div className="space-y-5 p-6">
                <div>
                  <p className="text-sm font-semibold text-ink-900">{t('Where the money goes')}</p>
                  <div className="mt-2 flex h-4 overflow-hidden rounded-full border-2 border-ink-900">
                    {parts.map((p) => (
                      <span
                        key={p.label}
                        className={`${p.color} h-full`}
                        style={{ width: `${(p.minor / partsTotal) * 100}%` }}
                      />
                    ))}
                  </div>
                  <dl className="mt-3 space-y-1.5 text-sm">
                    {parts.map((p) => (
                      <div key={p.label} className="flex items-center justify-between gap-3">
                        <dt className="flex items-center gap-2 text-ink-700">
                          <span className={`h-3 w-3 rounded-sm border border-ink-900 ${p.color}`} />
                          {p.label}
                        </dt>
                        <dd className="tabular font-medium text-ink-900">
                          {formatMoney(p.minor, quote.currency)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <dl className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { icon: Ruler, label: t('Size'), value: `${quote.bboxMm.join(' × ')} mm` },
                    { icon: Box, label: t('Volume'), value: `${quote.volumeCm3} cm³` },
                    {
                      icon: Weight,
                      label: t('Weight, each'),
                      value: `≈ ${Math.round(option.grams)} g`,
                    },
                    {
                      icon: Clock,
                      label: t('Print time, each'),
                      value: `≈ ${hours(option.printMinutes)}`,
                    },
                  ].map((f) => (
                    <div key={f.label} className="rounded-md border border-line bg-paper p-3">
                      <dt className="flex items-center gap-1.5 text-ink-600">
                        <f.icon className="h-4 w-4" aria-hidden /> {f.label}
                      </dt>
                      <dd className="tabular mt-1 font-semibold text-ink-900">{f.value}</dd>
                    </div>
                  ))}
                </dl>

                {quote.warnings.length > 0 && (
                  <ul className="space-y-1 rounded-md border border-amber-ink/30 bg-amber-soft p-3 text-sm text-amber-ink">
                    {quote.warnings.map((w) => (
                      <li key={w}>{t(w)}</li>
                    ))}
                  </ul>
                )}

                <div className="space-y-2">
                  <Button asChild size="lg" variant="accent" className="w-full">
                    <Link route="new_account.create">
                      {t('Create an account to order')} <ArrowRight />
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setFile(null)
                      setPreviewUrl(null)
                      setQuote(null)
                      inputRef.current?.click()
                    }}
                  >
                    {t('Price another file')}
                  </Button>
                </div>
                <p className="flex items-start gap-2 text-xs text-ink-600">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-fil-600" aria-hidden />
                  {t(
                    'An estimate from the model’s volume at standard quality (0.2 mm layers, 20% infill). The final price is confirmed when you order, and your payment is held until the part arrives.'
                  )}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-[14px] border-2 border-dashed border-ink-900/30 bg-paper-raised p-8">
              <div className="flex items-center gap-4">
                <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border-2 border-ink-900 bg-sun">
                  {busy ? (
                    <Loader2 className="h-8 w-8 animate-spin text-ink-900" aria-hidden />
                  ) : (
                    <PrintArt kind="vase" color="#f0501e" printing className="h-16 w-16" />
                  )}
                </span>
                <div>
                  <p className="font-display text-2xl font-semibold text-ink-900">
                    {busy ? t('Scanning and measuring your model…') : t('Your price appears here')}
                  </p>
                  <p className="mt-1 text-sm text-ink-700">
                    {t('Four materials, up to ten pieces, delivery included.')}
                  </p>
                </div>
              </div>
              <ul className="mt-6 space-y-2 text-sm text-ink-800">
                {[
                  t('We measure size, volume and weight from the file'),
                  t('Priced with the same formula as a real order'),
                  t('Scanned for viruses and hidden code first'),
                  t('No account, and the file is not kept'),
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-fil-600" aria-hidden /> {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </>
  )
}

QuickQuote.fullBleed = true
export default QuickQuote
