import { useState } from 'react'
import { router } from '@inertiajs/react'
import { makerNav } from '~/lib/nav'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { MoneyInput } from '~/components/money_input'
import { PageHeader } from '~/components/page_header'
import { formatMoney, formatNumber } from '~/lib/format'
import { useT } from '~/lib/i18n'
import { makerCost } from '~/lib/maker_cost'
import { minorToInput, parseMoneyToMinor } from '~/lib/money'

type Costs = {
  hourlyRateMinor: number
  setupMinor: number
  wasteBps: number
  failureBps: number
  profitBps: number
}

/** A rate in basis points as the maker types it: "10" or "7,5" (percent). */
const percentText = (bps: number) => minorToInput(bps).replace(/[.,]00$/, '')

function PercentField({
  id,
  label,
  help,
  value,
  onChange,
}: {
  id: string
  label: string
  help: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-28"
          aria-describedby={`${id}-help`}
        />
        <span className="text-sm text-ink-600">%</span>
      </div>
      <p id={`${id}-help`} className="text-xs text-ink-600">
        {help}
      </p>
    </div>
  )
}

export default function MakerCosts({
  costs,
  defaults,
  limits,
  materials,
}: {
  costs: Costs & { saved: boolean }
  defaults: Costs
  limits: { minBps: number; maxBps: number }
  materials: Array<{ material: string; costPerKgMinor: number }>
}) {
  const { t } = useT()

  const [hourly, setHourly] = useState<number | null>(costs.hourlyRateMinor)
  const [setup, setSetup] = useState<number | null>(costs.setupMinor)
  const [waste, setWaste] = useState(percentText(costs.wasteBps))
  const [failure, setFailure] = useState(percentText(costs.failureBps))
  const [profit, setProfit] = useState(percentText(costs.profitBps))

  // the example job: a palm-sized part, editable so the maker can try their own typical print
  const [material, setMaterial] = useState(materials[0]?.material ?? '')
  const [spool, setSpool] = useState<number | null>(materials[0]?.costPerKgMinor ?? 60_000)
  const [grams, setGrams] = useState('100')
  const [hours, setHours] = useState('5')

  const wasteBps = parseMoneyToMinor(waste)
  const failureBps = parseMoneyToMinor(failure)
  const profitBps = parseMoneyToMinor(profit)
  const profitOk = profitBps !== null && profitBps >= limits.minBps && profitBps <= limits.maxBps
  const failureOk = failureBps !== null && failureBps < 10_000
  const ready = hourly !== null && setup !== null && wasteBps !== null && failureOk && profitOk

  const gramsN = Number(grams.replace(',', '.'))
  const hoursN = Number(hours.replace(',', '.'))
  const example =
    ready && spool !== null && gramsN > 0 && hoursN > 0
      ? makerCost(
          {
            materialCostPerKgMinor: spool,
            hourlyRateMinor: hourly!,
            setupMinor: setup!,
            wasteBps: wasteBps!,
            failureBps: failureBps!,
            profitBps: profitBps!,
          },
          { grams: gramsN, minutes: Math.round(hoursN * 60) }
        )
      : null

  function save(e: React.FormEvent) {
    e.preventDefault()
    if (!ready) return
    router.post('/maker/costs', {
      hourlyRateMinor: hourly,
      setupMinor: setup,
      wasteBps,
      failureBps,
      profitBps,
    })
  }

  const rows = example
    ? [
        { label: t('Material, with waste'), minor: example.materialMinor },
        { label: t('Machine time'), minor: example.machineMinor },
        { label: t('Setup'), minor: example.setupMinor },
        {
          label: t('Allowance for failed prints'),
          minor:
            example.costMinor - example.materialMinor - example.machineMinor - example.setupMinor,
        },
        { label: t('Your profit'), minor: example.profitMinor },
      ]
    : []

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Your costs')}
        description={t(
          'What a print costs you. Your pay for every order is worked out from these numbers, with your profit on top, so an order never pays you less than it costs.'
        )}
      />
      {!costs.saved && (
        <p className="rounded-md border border-line bg-amber-soft px-4 py-3 text-sm text-amber-ink">
          {t(
            'You have not entered your own costs yet, so the platform reference is shown. Check each number and save.'
          )}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,24rem)]">
        <Card>
          <CardHeader>
            <CardTitle>{t('Your numbers')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={save} className="space-y-5">
              <div className="space-y-1">
                <Label htmlFor="hourly">{t('Machine hour')}</Label>
                <MoneyInput id="hourly" required valueMinor={hourly} onChange={setHourly} />
                <p className="text-xs text-ink-600">
                  {t(
                    'Power, wear and paying off the printer, per hour it prints. Reference: {value}.',
                    { value: formatMoney(defaults.hourlyRateMinor) }
                  )}
                </p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="setup">{t('Setup per print job')}</Label>
                <MoneyInput id="setup" required valueMinor={setup} onChange={setSetup} />
                <p className="text-xs text-ink-600">
                  {t('Preparing the print, removing supports and packing, once per order line.')}
                </p>
              </div>
              <PercentField
                id="waste"
                label={t('Material waste')}
                help={t('Extra material lost to purging, brims and supports.')}
                value={waste}
                onChange={setWaste}
              />
              <PercentField
                id="failure"
                label={t('Failed prints')}
                help={t(
                  'Share of prints that fail and are printed again; the cost is spread over the good ones.'
                )}
                value={failure}
                onChange={setFailure}
              />
              <PercentField
                id="profit"
                label={t('Your profit')}
                help={t(
                  'Between {min}% and {max}%. A higher profit pays more per order, but fewer orders fit.',
                  {
                    min: formatNumber(limits.minBps / 100),
                    max: formatNumber(limits.maxBps / 100),
                  }
                )}
                value={profit}
                onChange={setProfit}
              />
              {!profitOk && (
                <p className="text-sm text-danger" role="alert">
                  {t('Your profit must be between {min}% and {max}%', {
                    min: formatNumber(limits.minBps / 100),
                    max: formatNumber(limits.maxBps / 100),
                  })}
                </p>
              )}
              <p className="text-xs text-ink-600">
                {t('Material prices are set per printer, on the Printers page.')}
              </p>
              <Button type="submit" disabled={!ready}>
                {t('Save costs')}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="h-fit lg:sticky lg:top-6">
          <CardHeader>
            <CardTitle>{t('What you are paid for a print')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {materials.length > 0 ? (
                <div className="col-span-2 space-y-1">
                  <Label htmlFor="example-material">{t('Material')}</Label>
                  <select
                    id="example-material"
                    className="h-10 w-full rounded-md border border-line bg-paper-raised px-2 text-sm"
                    value={material}
                    onChange={(e) => {
                      setMaterial(e.target.value)
                      setSpool(
                        materials.find((m) => m.material === e.target.value)?.costPerKgMinor ?? null
                      )
                    }}
                  >
                    {materials.map((m) => (
                      <option key={m.material} value={m.material}>
                        {m.material} · {t('{price}/kg', { price: formatMoney(m.costPerKgMinor) })}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="col-span-2 space-y-1">
                  <Label htmlFor="example-spool">{t('Material per kg')}</Label>
                  <MoneyInput id="example-spool" valueMinor={spool} onChange={setSpool} />
                </div>
              )}
              <div className="space-y-1">
                <Label htmlFor="example-grams">{t('Weight (g)')}</Label>
                <Input
                  id="example-grams"
                  inputMode="decimal"
                  value={grams}
                  onChange={(e) => setGrams(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="example-hours">{t('Print time (h)')}</Label>
                <Input
                  id="example-hours"
                  inputMode="decimal"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                />
              </div>
            </div>

            {example ? (
              <dl className="space-y-2 border-t border-line pt-3 text-sm" aria-live="polite">
                {rows.map((r) => (
                  <div key={r.label} className="flex justify-between gap-3">
                    <dt className="text-ink-600">{r.label}</dt>
                    <dd className="tabular-nums text-ink-900">{formatMoney(r.minor)}</dd>
                  </div>
                ))}
                <div className="flex items-baseline justify-between gap-3 border-t border-line pt-3">
                  <dt className="font-semibold text-ink-900">{t('You are paid')}</dt>
                  <dd className="font-display text-2xl font-semibold tabular-nums text-ink-900">
                    {formatMoney(example.floorMinor)}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-ink-600">
                {t('Fill in every number to see the example.')}
              </p>
            )}
            <p className="text-xs text-ink-600">
              {t(
                'Shipping is paid to you on top. The platform fee is added to the buyer’s price, not taken from yours.'
              )}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

MakerCosts.layout = 'dashboard'
MakerCosts.dashboardProps = { navItems: makerNav, title: 'Maker' }
