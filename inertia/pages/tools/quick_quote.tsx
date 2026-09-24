import { useState } from 'react'
import { Head } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { Loader2 } from 'lucide-react'
import { postForm } from '~/lib/api'
import { Button } from '~/components/ui/button'
import { Label } from '~/components/ui/label'
import { Money } from '~/components/money'
import { useT } from '~/lib/i18n'

type Quote = {
  volumeCm3: number
  bboxMm: [number, number, number]
  material: string
  grams: number
  printMinutes: number
  unitPriceMinor: number
  shippingMinor: number
  totalMinor: number
  currency: string
  warnings: string[]
}

function QuickQuote({ materials }: { materials: Array<{ key: string; label: string }> }) {
  const { t } = useT()

  const [file, setFile] = useState<File | null>(null)
  const [material, setMaterial] = useState(materials[0]?.key ?? 'PLA')
  const [quote, setQuote] = useState<Quote | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setBusy(true)
    setError(null)
    setQuote(null)
    try {
      const form = new FormData()
      form.append('material', material)
      form.append('model', file)
      const data = await postForm<{ quote: Quote }>('/tools/quick-quote', form)
      setQuote(data.quote)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

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
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-heat-700">
            {t('Instant price')}
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold leading-tight text-ink-900 sm:text-5xl">
            {t('What would this print cost?')}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-700">
            {t(
              'Drop in an STL. We read its size, show an estimate, and forget the file — it is never stored or shared.'
            )}
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:px-8">
        <form
          onSubmit={submit}
          className="space-y-4 rounded-[10px] border border-line bg-paper-raised p-6"
        >
          <div className="space-y-1">
            <Label htmlFor="qq-file">{t('STL file (up to 15 MB)')}</Label>
            <input
              id="qq-file"
              type="file"
              accept=".stl"
              required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="qq-material">{t('Material')}</Label>
            <select
              id="qq-material"
              className="flex h-10 w-full rounded-md border border-line bg-paper-raised px-3 text-sm"
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
            >
              {materials.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" className="w-full" disabled={!file || busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            {t('Get the price')}
          </Button>
          {error && (
            <p role="alert" className="rounded-md bg-danger-100 p-3 text-sm text-danger">
              {t(error)}
            </p>
          )}
          <p className="text-xs text-ink-600">
            {t(
              'One piece, standard quality (0.2 mm, 20% infill), delivered within Türkiye. Anything else is priced once you sign in.'
            )}
          </p>
        </form>

        <div className="space-y-4">
          {quote ? (
            <div className="rounded-[10px] border border-line bg-paper-raised p-6">
              <p className="text-sm text-ink-600">{t('Estimated total, delivered')}</p>
              <p className="tabular font-display text-5xl font-semibold text-ink-900">
                <Money minor={quote.totalMinor} currency={quote.currency} />
              </p>
              <dl className="mt-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-600">{t('Part')}</dt>
                  <dd className="tabular">
                    {t('{v2} mm · {volumeCm3} cm³', {
                      v2: quote.bboxMm.join(' × '),
                      volumeCm3: quote.volumeCm3,
                    })}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-600">{t('Material')}</dt>
                  <dd>
                    {t('{material} · about {grams} g', {
                      material: quote.material,
                      grams: quote.grams,
                    })}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-600">{t('Print and materials')}</dt>
                  <dd>
                    <Money
                      minor={quote.unitPriceMinor - quote.shippingMinor}
                      currency={quote.currency}
                    />
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-600">{t('Shipping')}</dt>
                  <dd>
                    <Money minor={quote.shippingMinor} currency={quote.currency} />
                  </dd>
                </div>
              </dl>
              {quote.warnings.length > 0 && (
                <ul className="mt-4 space-y-1 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                  {quote.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              )}
              <p className="mt-4 text-xs text-ink-600">
                {t(
                  'An estimate from the model’s volume; the final price is confirmed when you order.'
                )}
              </p>
              <Button asChild className="mt-4 w-full" variant="accent">
                <Link route="new_account.create">{t('Create an account to order')}</Link>
              </Button>
            </div>
          ) : (
            <div className="rounded-[10px] border border-dashed border-ink-900/25 p-6 text-ink-700">
              {t('Your estimate appears here, with the size we measured and what it is made of.')}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

QuickQuote.fullBleed = true
export default QuickQuote
