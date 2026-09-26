import { useState } from 'react'
import { Link } from '@adonisjs/inertia/react'
import { ArrowRight, FileUp, Loader2, RotateCcw, ShieldCheck } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { CountUp } from '~/components/count_up'
import { ScanPanel } from '~/components/scan_panel'
import { postForm } from '~/lib/api'
import { formatMoney } from '~/lib/format'
import { useT } from '~/lib/i18n'

type Option = {
  material: string
  label: string
  totals: Array<{ quantity: number; totalMinor: number }>
}
type Quote = { currency: string; bboxMm: [number, number, number]; options: Option[] }

const SAMPLE_URL = '/samples/sample-vase.stl'

/** Price right in the hero: drop an STL, see the delivered price in four materials. */
export function HeroQuickStart() {
  const { t } = useT()
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [blocked, setBlocked] = useState<string | null>(null)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [name, setName] = useState('')
  const [material, setMaterial] = useState('PLA')

  async function price(file: File | null) {
    if (!file) return
    setError(null)
    setBlocked(null)
    if (!/\.(stl|3mf|obj)$/i.test(file.name)) {
      setError('Choose an STL, 3MF or OBJ file.')
      return
    }
    setBusy(true)
    setName(file.name)
    try {
      const form = new FormData()
      form.append('material', 'PLA')
      form.append('model', file)
      const data = await postForm<{ quote: Quote }>('/tools/quick-quote', form)
      setQuote(data.quote)
      setMaterial('PLA')
    } catch (err) {
      const failure = err as Error & { blocked?: boolean }
      if (failure.blocked) setBlocked(failure.message)
      else setError(failure.message)
    } finally {
      setBusy(false)
    }
  }

  async function sample() {
    const blob = await fetch(SAMPLE_URL).then((r) => r.blob())
    await price(new File([blob], 'sample-vase.stl', { type: 'model/stl' }))
  }

  const option = quote?.options.find((o) => o.material === material)
  const total = option?.totals[0]?.totalMinor ?? 0

  if (quote && option) {
    return (
      <div
        aria-live="polite"
        className="rounded-[14px] border-2 border-ink-900 bg-paper-raised p-5 shadow-[5px_5px_0_#15181c]"
      >
        <p className="truncate text-sm text-ink-700">
          {t('{file} · {size} mm · one piece, delivered in Türkiye', {
            file: name,
            size: quote.bboxMm.join(' × '),
          })}
        </p>
        <p className="mt-1 font-display text-5xl font-semibold tabular-nums text-ink-900">
          <CountUp value={total} format={(m) => formatMoney(m, quote.currency)} />
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-fil-700">
          <ShieldCheck className="h-4 w-4" aria-hidden /> {t('Virus scan passed')}
        </p>
        <div role="radiogroup" aria-label={t('Material')} className="mt-3 flex flex-wrap gap-2">
          {quote.options.map((o) => (
            <button
              key={o.material}
              type="button"
              role="radio"
              aria-checked={o.material === material}
              onClick={() => setMaterial(o.material)}
              className={`rounded-full border-2 px-3 py-1 text-sm font-semibold tabular-nums ${
                o.material === material
                  ? 'border-ink-900 bg-lime text-ink-900'
                  : 'border-ink-900/25 text-ink-800 hover:border-ink-900'
              }`}
            >
              {o.label} · {formatMoney(o.totals[0].totalMinor, quote.currency)}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button size="lg" variant="accent" asChild>
            <Link route="new_account.create">
              {t('Create an account to order')} <ArrowRight />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/tools/quick-quote">{t('More options')}</Link>
          </Button>
        </div>
        <button
          type="button"
          onClick={() => setQuote(null)}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-700 underline underline-offset-4 hover:text-ink-900"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden /> {t('Price another file')}
        </button>
      </div>
    )
  }

  return (
    <div>
      <label
        htmlFor="hero-file"
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          void price(e.dataTransfer.files?.[0] ?? null)
        }}
        className={`flex cursor-pointer items-center gap-4 rounded-[14px] border-2 border-dashed p-5 transition-colors ${
          dragging ? 'border-ink-900 bg-lime/40' : 'border-ink-900 bg-paper-raised hover:bg-lime/20'
        }`}
      >
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border-2 border-ink-900 bg-lime shadow-[3px_3px_0_#15181c]">
          {busy ? (
            <Loader2 className="h-7 w-7 animate-spin text-ink-900" aria-hidden />
          ) : (
            <FileUp className="h-7 w-7 text-ink-900" aria-hidden />
          )}
        </span>
        <span>
          <span className="block font-display text-xl font-semibold text-ink-900">
            {busy ? t('Measuring your model…') : t('Drop your STL, 3MF or OBJ here')}
          </span>
          <span className="block text-sm text-ink-700">
            {t('See the delivered price in seconds. No account needed.')}
          </span>
        </span>
        <input
          id="hero-file"
          type="file"
          accept=".stl,.3mf,.obj"
          className="sr-only"
          onChange={(e) => void price(e.target.files?.[0] ?? null)}
        />
      </label>
      <p className="mt-2 text-sm text-ink-700">
        {t('No file at hand?')}{' '}
        <button
          type="button"
          disabled={busy}
          onClick={() => void sample()}
          className="font-semibold text-ink-900 underline underline-offset-4 hover:no-underline"
        >
          {t('Try it with our sample vase')}
        </button>
      </p>
      {(busy || blocked) && (
        <div className="mt-2">
          <ScanPanel state={busy ? 'scanning' : 'blocked'} reason={blocked} compact />
        </div>
      )}
      {error && (
        <p
          role="alert"
          className="mt-2 rounded-md border-2 border-danger/40 bg-danger-soft p-3 text-sm text-danger"
        >
          {t(error)}
        </p>
      )}
    </div>
  )
}
