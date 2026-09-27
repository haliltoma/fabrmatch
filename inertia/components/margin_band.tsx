import { useState } from 'react'
import { Link } from '@adonisjs/inertia/react'
import { ArrowRight } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Label } from '~/components/ui/label'
import { CountUp } from '~/components/count_up'
import { formatPrice } from '~/lib/format'
import { marginSplit } from '~/lib/margin'
import { useT } from '~/lib/i18n'

export type MarginSample = { id: number; title: string; material: string; costMinor: number }

/** Real catalog designs priced by our engine; the visitor only picks the margin. */
export function MarginBand({ samples }: { samples: MarginSample[] }) {
  const { t } = useT()
  const [id, setId] = useState(samples[0]?.id)
  const [margin, setMargin] = useState(30)
  const sample = samples.find((s) => s.id === id) ?? samples[0]
  if (!sample) return null
  const { earnsMinor, buyerPriceMinor } = marginSplit(sample.costMinor, margin)

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid gap-10 rounded-[14px] border-2 border-ink-900 bg-blush/40 p-6 sm:p-10 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-900">
            {t('For sellers')}
          </p>
          <h2 className="mt-3 font-display text-4xl font-semibold leading-tight text-ink-900">
            {t('Your margin, in money, per piece sold')}
          </h2>
          <p className="mt-4 max-w-md text-ink-800">
            {t(
              'Pick a design from our catalog and a margin. Production, shipping within Türkiye and the platform fee are already in the cost; the rest is yours.'
            )}
          </p>
          <Button className="mt-6" variant="default" asChild>
            <Link href="/for-sellers">
              {t('See how selling works')} <ArrowRight />
            </Link>
          </Button>
        </div>

        <div className="rounded-lg border-2 border-ink-900 bg-paper-raised p-6">
          <div className="space-y-1">
            <Label htmlFor="margin-design">{t('Design')}</Label>
            <select
              id="margin-design"
              className="flex h-11 w-full rounded-md border border-ink-900/25 bg-paper-raised px-3 text-sm"
              value={sample.id}
              onChange={(e) => setId(Number(e.target.value))}
            >
              {samples.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} · {s.material}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-5 space-y-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="margin-range">{t('Your margin')}</Label>
              <span className="font-mono text-sm text-ink-900">{t('{n}%', { n: margin })}</span>
            </div>
            <input
              id="margin-range"
              type="range"
              min={0}
              max={100}
              step={5}
              value={margin}
              onChange={(e) => setMargin(Number(e.target.value))}
              className="w-full accent-ink-900"
            />
          </div>
          <dl
            className="mt-6 grid grid-cols-3 gap-4 border-t border-line pt-5 text-sm"
            aria-live="polite"
          >
            <div>
              <dt className="text-ink-600">{t('Cost')}</dt>
              <dd className="mt-1 font-semibold tabular-nums text-ink-900">
                {formatPrice(sample.costMinor, 'TRY')}
              </dd>
            </div>
            <div>
              <dt className="text-ink-600">{t('Buyer pays')}</dt>
              <dd className="mt-1 font-semibold tabular-nums text-ink-900">
                {formatPrice(buyerPriceMinor, 'TRY')}
              </dd>
            </div>
            <div>
              <dt className="text-ink-600">{t('You keep')}</dt>
              <dd className="mt-1 font-display text-3xl font-semibold tabular-nums text-fil-600">
                <CountUp value={earnsMinor} format={(m) => formatPrice(m, 'TRY')} />
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-ink-600">
            {t(
              'Today’s reference prices for one piece; the price at checkout follows the buyer’s address.'
            )}
          </p>
        </div>
      </div>
    </section>
  )
}
