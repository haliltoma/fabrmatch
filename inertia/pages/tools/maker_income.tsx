import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Price } from '~/components/money'
import { useT } from '~/lib/i18n'
import { Seo } from '~/components/seo'

type Estimate = {
  printHoursPerMonth: number
  gramsPerMonth: number
  perPrintHourMinor: number
  materialMinor: number
  machineMinor: number
  profitMinor: number
  monthlyMinor: number
}
type Inputs = { printers: number; hours: number; busy: number; price: string }

function MakerIncome({
  inputs,
  estimate,
  priceError,
}: {
  inputs: Inputs
  estimate: Estimate | null
  priceError: string | null
}) {
  const { t } = useT()

  const [form, setForm] = useState({
    printers: String(inputs.printers),
    hours: String(inputs.hours),
    busy: String(inputs.busy),
    price: inputs.price,
  })
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <>
      <Seo
        title={t('What could my 3D printers earn? — maker income calculator')}
        description={t(
          'Estimate what your 3D printers could earn on Fabrmatch from machine hours, how busy they are and your price per gram. The formula is shown, not hidden.'
        )}
        breadcrumbs={[{ name: t('Maker income calculator') }]}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          'name': t('Maker income calculator'),
          'applicationCategory': 'BusinessApplication',
          'operatingSystem': 'Any',
          'offers': { '@type': 'Offer', 'price': '0', 'priceCurrency': 'TRY' },
        }}
      />

      <section className="layer-lines border-b border-line">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-heat-700">
            {t('Maker income calculator')}
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold leading-tight text-ink-900 sm:text-5xl">
            {t('What could my printers earn?')}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-700">
            {t(
              'A worked example with the same formula our prices use. You choose how busy the printers are; we do not promise any number of orders.'
            )}
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:px-8">
        <form
          className="space-y-4 rounded-[10px] border border-line bg-paper-raised p-6"
          onSubmit={(e) => {
            e.preventDefault()
            router.get('/tools/maker-income', form, { preserveScroll: true })
          }}
        >
          {(
            [
              ['printers', 'Printers', 'number', 'How many machines could take orders'],
              [
                'hours',
                'Hours per day available',
                'number',
                'Hours each machine could run for Fabrmatch jobs',
              ],
              [
                'busy',
                'How busy, % of those hours',
                'number',
                'Your assumption. 40 means four in ten hours get an order',
              ],
              [
                'price',
                'Your price per gram (TRY)',
                'text',
                'Filament plus your cost of prep and waste',
              ],
            ] as const
          ).map(([key, label, type, hint]) => (
            <div key={key} className="space-y-1">
              <Label htmlFor={`mi-${key}`}>{t(label)}</Label>
              <Input
                id={`mi-${key}`}
                type={type}
                inputMode={type === 'number' ? 'numeric' : 'decimal'}
                value={form[key]}
                onChange={(e) => set(key)(e.target.value)}
                aria-describedby={`mi-${key}-hint`}
              />
              <p id={`mi-${key}-hint`} className="text-xs text-ink-600">
                {t(hint)}
              </p>
            </div>
          ))}
          {priceError && <p className="text-sm font-medium text-danger">{t(priceError)}</p>}
          <Button type="submit" className="w-full">
            {t('Calculate')}
          </Button>
        </form>

        <div className="space-y-6">
          {estimate ? (
            <>
              <div className="rounded-[10px] border border-line bg-paper-raised p-6">
                <p className="text-sm text-ink-600">{t('Estimated per month')}</p>
                <p className="tabular font-display text-5xl font-semibold text-ink-900">
                  <Price minor={estimate.monthlyMinor} />
                </p>
                <p className="mt-2 text-sm text-ink-600">
                  {t(
                    '{printHoursPerMonth} print hours · about {gramsPerMonth} g of filament · before tax and your own running costs',
                    {
                      printHoursPerMonth: estimate.printHoursPerMonth,
                      gramsPerMonth: estimate.gramsPerMonth,
                    }
                  )}
                </p>
              </div>

              <div className="rounded-[10px] border border-line bg-paper-raised p-6">
                <h2 className="font-display text-xl font-semibold text-ink-900">
                  {t('How it adds up')}
                </h2>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-ink-600">{t('Material at your price')}</dt>
                    <dd>
                      <Price minor={estimate.materialMinor} />
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-600">{t('Machine time')}</dt>
                    <dd>
                      <Price minor={estimate.machineMinor} />
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-600">{t('Your margin')}</dt>
                    <dd>
                      <Price minor={estimate.profitMinor} />
                    </dd>
                  </div>
                  <div className="flex justify-between border-t border-line pt-2 font-semibold text-ink-900">
                    <dt>{t('Your share')}</dt>
                    <dd>
                      <Price minor={estimate.monthlyMinor} />
                    </dd>
                  </div>
                </dl>
                <p className="mt-3 text-xs text-ink-600">
                  {t('Per print hour that is')} <Price minor={estimate.perPrintHourMinor} />
                  {t(
                    '. It assumes a printer produces about 12 g an hour; large or dense parts differ. The platform fee is added on top of your share, so it does not reduce it. Shipping is paid to you separately.'
                  )}
                </p>
              </div>
            </>
          ) : (
            <p className="rounded-[10px] border border-line bg-paper-raised p-6 text-ink-700">
              {t('Fix the price and calculate again.')}
            </p>
          )}

          <div className="rounded-[10px] border border-line bg-paper-sunken p-6">
            <p className="font-display text-lg font-semibold text-ink-900">
              {t('Want offers like this?')}
            </p>
            <p className="mt-1 text-sm text-ink-700">
              {t('We open city by city. Put your printers on the list.')}
            </p>
            <Button asChild className="mt-4">
              <Link href="/for-makers#join">{t('Join the maker list')}</Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

MakerIncome.fullBleed = true
export default MakerIncome
