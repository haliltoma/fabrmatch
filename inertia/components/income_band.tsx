import { useState } from 'react'
import { Link } from '@adonisjs/inertia/react'
import { ArrowRight } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { CountUp } from '~/components/count_up'
import { formatPrice } from '~/lib/format'
import { monthlyIncomeMinor, type IncomeRules } from '~/lib/income'
import { parseMoneyToMinor } from '~/lib/money'
import { useT } from '~/lib/i18n'

/** A worked example of our own formula for makers; the visitor picks how busy the printers are. */
export function IncomeBand({ rules }: { rules: IncomeRules }) {
  const { t } = useT()
  const [printers, setPrinters] = useState('1')
  const [hours, setHours] = useState('6')
  const [busy, setBusy] = useState('40')
  const [price, setPrice] = useState('0.60')

  const pricePerGramMinor = parseMoneyToMinor(price)
  const valid = pricePerGramMinor !== null && pricePerGramMinor > 0
  const result = valid
    ? monthlyIncomeMinor(
        {
          printers: Math.min(Math.max(Number(printers) || 1, 1), 50),
          hoursPerDay: Math.min(Math.max(Number(hours) || 1, 1), 24),
          busyPercent: Number(busy) || 1,
          pricePerGramMinor,
        },
        rules
      )
    : null

  const field = (
    id: string,
    label: string,
    value: string,
    set: (v: string) => void,
    inputMode: 'numeric' | 'decimal' = 'numeric'
  ) => (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-paper">
        {label}
      </Label>
      <Input
        id={id}
        inputMode={inputMode}
        value={value}
        onChange={(e) => set(e.target.value)}
        className="border-paper/30 bg-ink-800 text-paper"
      />
    </div>
  )

  return (
    <section
      id="maker-income"
      className="scroll-mt-20 palette-light layer-lines-light bg-ink-900 text-paper"
    >
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:px-8">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-heat-400">
            {t('For makers')}
          </p>
          <h2 className="mt-3 font-display text-4xl font-semibold leading-tight">
            {t('See what your printers could earn')}
          </h2>
          <p className="mt-4 max-w-md text-ink-200">
            {t(
              'A worked example of the formula our prices use. You choose how busy the printers are; we do not promise any number of orders.'
            )}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="accent" asChild>
              <Link href="/tools/maker-income">
                {t('Open the full calculator')} <ArrowRight />
              </Link>
            </Button>
            <Button variant="outline" className="border-paper/40 bg-transparent text-paper" asChild>
              <Link href="/for-makers">{t('Join the maker list')}</Link>
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-paper/15 bg-ink-800 p-6">
          <div className="grid grid-cols-2 gap-4">
            {field('home-printers', t('Printers'), printers, setPrinters)}
            {field('home-hours', t('Hours per day available'), hours, setHours)}
            {field('home-busy', t('How busy, % of those hours'), busy, setBusy)}
            {field('home-price', t('Your price per gram (TRY)'), price, setPrice, 'decimal')}
          </div>
          <div className="mt-6 border-t border-paper/15 pt-5" aria-live="polite">
            <p className="text-sm text-ink-200">{t('Estimated per month')}</p>
            {result ? (
              <>
                <p className="font-display text-6xl font-semibold tabular-nums text-lime">
                  <CountUp
                    value={result.monthlyMinor}
                    format={(minor) => formatPrice(minor, 'TRY')}
                  />
                </p>
                <p className="mt-2 text-sm text-ink-300">
                  {t(
                    '{hours} print hours a month, before tax and your own running costs. An example, not a promise.',
                    {
                      hours: Math.round(result.printHours * 10) / 10,
                    }
                  )}
                </p>
              </>
            ) : (
              <p className="text-sm font-medium text-heat-300">{t('Enter a price like 0.50')}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
