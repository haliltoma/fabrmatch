import { useState } from 'react'
import { router } from '@inertiajs/react'
import { adminNav } from '~/lib/nav'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { PageHeader } from '~/components/page_header'
import { formatMoney } from '~/lib/format'
import { useT } from '~/lib/i18n'

type Rounding = 'none' | 'whole' | 'charm99'

type Region = {
  id: number
  code: string
  name: string
  currency: string
  countries: string[]
  isFallback: boolean
  multiplierPercent: number
  commissionPercent: number | null
  minOrderMinor: number
  rounding: Rounding
  materialPrices: Record<string, number>
}

type MaterialRef = { code: string; label: string; baseMinor: number }

const CURRENCIES = ['TRY', 'EUR', 'GBP', 'USD']
const ROUNDINGS: Array<[Rounding, string]> = [
  ['none', 'No rounding'],
  ['whole', 'Up to a whole amount (12.34 → 13.00)'],
  ['charm99', 'Up to .99 (12.34 → 12.99)'],
]

const selectClass =
  'flex h-10 w-full rounded-md border border-line bg-paper-raised px-3 py-2 text-sm'

function MaterialRow({ region, material }: { region: Region; material: MaterialRef }) {
  const { t } = useT()
  const own = region.materialPrices[material.code]
  const effective = own ?? Math.ceil((material.baseMinor * region.multiplierPercent) / 100)
  const [price, setPrice] = useState(own === undefined ? '' : (own / 100).toFixed(2))
  const id = `mp-${region.id}-${material.code}`
  const save = (value: number | null) =>
    router.post(
      `/admin/pricing-regions/${region.id}/materials`,
      { material: material.code, price: value },
      { preserveScroll: true }
    )
  return (
    <li className="grid grid-cols-[minmax(0,1fr)] items-end gap-2 py-3 sm:grid-cols-[8rem_1fr_1fr_8.5rem]">
      <p className="font-medium text-ink-900">{material.label}</p>
      <p className="text-sm text-ink-700">
        {t('Base')}{' '}
        <span className="tabular font-mono">{formatMoney(material.baseMinor, 'TRY')}</span> ·{' '}
        {t('Here')}{' '}
        <span className="tabular font-mono text-ink-900">{formatMoney(effective, 'TRY')}</span>
        {own === undefined ? ` (${t('price level')})` : ` (${t('own price')})`}
      </p>
      <div className="space-y-1">
        <Label htmlFor={id} className="sm:sr-only">
          {t('Own price per gram (TRY)')}
        </Label>
        <Input
          id={id}
          type="number"
          step="0.01"
          min="0.01"
          inputMode="decimal"
          placeholder={t('Use the price level')}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => price !== '' && save(Number(price))}>
          {t('Save')}
        </Button>
        {own !== undefined && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setPrice('')
              save(null)
            }}
          >
            {t('Clear')}
          </Button>
        )}
      </div>
    </li>
  )
}

function RegionCard({
  region,
  materials,
  globalCommissionPercent,
}: {
  region: Region
  materials: MaterialRef[]
  globalCommissionPercent: number
}) {
  const { t } = useT()
  const [form, setForm] = useState({
    name: region.name,
    currency: region.currency,
    countries: region.countries.join(', '),
    multiplierPercent: String(region.multiplierPercent),
    commissionPercent: region.commissionPercent === null ? '' : String(region.commissionPercent),
    minOrder: (region.minOrderMinor / 100).toFixed(2),
    rounding: region.rounding,
  })
  const set = (key: keyof typeof form) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }))
  const field = (key: string) => `r-${region.id}-${key}`

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-lg">
          {region.name}{' '}
          <span className="tabular font-mono text-xs text-ink-600">{region.code}</span>
        </CardTitle>
        {region.isFallback ? (
          <Badge variant="secondary">{t('Every other country')}</Badge>
        ) : (
          <Badge variant="outline">
            {region.countries.length === 1
              ? t('1 country')
              : t('{n} countries', { n: region.countries.length })}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault()
            router.post(
              `/admin/pricing-regions/${region.id}`,
              {
                name: form.name,
                currency: form.currency,
                ...(region.isFallback ? {} : { countries: form.countries }),
                multiplierPercent: Number(form.multiplierPercent),
                commissionPercent:
                  form.commissionPercent === '' ? null : Number(form.commissionPercent),
                minOrder: Number(form.minOrder),
                rounding: form.rounding,
              },
              { preserveScroll: true }
            )
          }}
        >
          <div className="space-y-1">
            <Label htmlFor={field('name')}>{t('Name')}</Label>
            <Input
              id={field('name')}
              value={form.name}
              onChange={(e) => set('name')(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={field('currency')}>{t('Preferred currency')}</Label>
            <select
              id={field('currency')}
              className={selectClass}
              value={form.currency}
              onChange={(e) => set('currency')(e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor={field('countries')}>{t('Countries')}</Label>
            {region.isFallback ? (
              <p id={field('countries')} className="text-sm text-ink-700">
                {t('Any country not listed in another region is priced here.')}
              </p>
            ) : (
              <>
                <Input
                  id={field('countries')}
                  aria-describedby={`${field('countries')}-help`}
                  value={form.countries}
                  onChange={(e) => set('countries')(e.target.value)}
                />
                <p id={`${field('countries')}-help`} className="text-xs text-ink-600">
                  {t('Two-letter codes separated by commas, like DE, FR, NL.')}
                </p>
              </>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor={field('level')}>{t('Price level (%)')}</Label>
            <Input
              id={field('level')}
              type="number"
              step="1"
              min="10"
              max="1000"
              aria-describedby={`${field('level')}-help`}
              value={form.multiplierPercent}
              onChange={(e) => set('multiplierPercent')(e.target.value)}
            />
            <p id={`${field('level')}-help`} className="text-xs text-ink-600">
              {t('100 = base prices. 120 makes every material 20% dearer here.')}
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor={field('fee')}>{t('Platform commission (%)')}</Label>
            <Input
              id={field('fee')}
              type="number"
              step="0.1"
              min="0"
              max="50"
              placeholder={t('Global: {n}%', { n: globalCommissionPercent })}
              aria-describedby={`${field('fee')}-help`}
              value={form.commissionPercent}
              onChange={(e) => set('commissionPercent')(e.target.value)}
            />
            <p id={`${field('fee')}-help`} className="text-xs text-ink-600">
              {t('Leave empty to use the global setting.')}
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor={field('min')}>{t('Minimum order (TRY)')}</Label>
            <Input
              id={field('min')}
              type="number"
              step="0.01"
              min="0"
              aria-describedby={`${field('min')}-help`}
              value={form.minOrder}
              onChange={(e) => set('minOrder')(e.target.value)}
            />
            <p id={`${field('min')}-help`} className="text-xs text-ink-600">
              {t('0 = no minimum.')}
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor={field('rounding')}>{t('Round unit prices')}</Label>
            <select
              id={field('rounding')}
              className={selectClass}
              value={form.rounding}
              onChange={(e) => set('rounding')(e.target.value)}
            >
              {ROUNDINGS.map(([value, label]) => (
                <option key={value} value={value}>
                  {t(label)}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit">{t('Save region')}</Button>
          </div>
        </form>

        <section aria-labelledby={field('materials')} className="border-t border-line pt-4">
          <h3 id={field('materials')} className="text-sm font-medium text-ink-900">
            {t('Material prices per gram')}
          </h3>
          <p className="text-xs text-ink-600">
            {t(
              'Makers here are matched only up to this price. An own price replaces the price level for that material.'
            )}
          </p>
          <div
            aria-hidden="true"
            className="mt-3 hidden grid-cols-[8rem_1fr_1fr_8.5rem] gap-2 text-xs text-ink-600 sm:grid"
          >
            <span>{t('Material')}</span>
            <span>{t('Price per gram')}</span>
            <span>{t('Own price per gram (TRY)')}</span>
            <span />
          </div>
          <ul className="divide-y divide-line">
            {materials.map((m) => (
              <MaterialRow
                key={`${m.code}:${region.materialPrices[m.code] ?? ''}`}
                region={region}
                material={m}
              />
            ))}
          </ul>
        </section>
      </CardContent>
    </Card>
  )
}

export default function AdminPricingRegions({
  regions,
  materials,
  globalCommissionPercent,
}: {
  regions: Region[]
  materials: MaterialRef[]
  globalCommissionPercent: number
}) {
  const { t } = useT()
  const [draft, setDraft] = useState({ code: '', name: '', countries: '', currency: 'USD' })
  const set = (key: keyof typeof draft) => (value: string) =>
    setDraft((d) => ({ ...d, [key]: value }))

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t('Region pricing')}
        description={t(
          'Each delivery country is priced by its region: price level, commission, minimum order and rounding. Changes apply to new prices only; placed orders keep theirs.'
        )}
      />
      {regions.map((r) => (
        <RegionCard
          key={JSON.stringify(r)}
          region={r}
          materials={materials}
          globalCommissionPercent={globalCommissionPercent}
        />
      ))}
      <Card>
        <CardHeader>
          <CardTitle>{t('New region')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault()
              router.post('/admin/pricing-regions', draft, { preserveScroll: true })
            }}
          >
            {(
              [
                ['code', 'Code', 'GCC'],
                ['name', 'Name', 'Gulf'],
                ['countries', 'Countries', 'AE, SA'],
              ] as const
            ).map(([key, label, example]) => (
              <div key={key} className="space-y-1">
                <Label htmlFor={`nr-${key}`}>{t(label)}</Label>
                <Input
                  id={`nr-${key}`}
                  placeholder={example}
                  value={draft[key]}
                  onChange={(e) => set(key)(e.target.value)}
                />
              </div>
            ))}
            <div className="space-y-1">
              <Label htmlFor="nr-currency">{t('Preferred currency')}</Label>
              <select
                id="nr-currency"
                className={selectClass}
                value={draft.currency}
                onChange={(e) => set('currency')(e.target.value)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-ink-600 sm:col-span-2">
              {t('A new region starts at base prices; set its rules after adding it.')}
            </p>
            <div className="sm:col-span-2">
              <Button type="submit">{t('Add region')}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

AdminPricingRegions.layout = 'dashboard'
AdminPricingRegions.dashboardProps = { navItems: adminNav, title: 'Admin' }
