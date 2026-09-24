import { useState } from 'react'
import { router } from '@inertiajs/react'
import { adminNav } from '~/lib/nav'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { MoneyInput } from '~/components/money_input'
import { PageHeader } from '~/components/page_header'
import { useT } from '~/lib/i18n'

type Zone = {
  id: number
  code: string
  name: string
  countries: string[]
  isFallback: boolean
  extraPerKgMinor: number
  currency: string
  rates: Array<{ id: number; upToGrams: number; priceMinor: number }>
}

function PriceRow({ label, initial, url }: { label: string; initial: number; url: string }) {
  const { t } = useT()

  const [minor, setMinor] = useState<number | null>(initial)
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-2">
      <span className="text-ink-900">{label}</span>
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (minor !== null) router.post(url, { priceMinor: minor })
        }}
      >
        <MoneyInput id={url} valueMinor={minor} onChange={setMinor} />
        <Button type="submit" size="sm" disabled={minor === null || minor === initial}>
          {t('Save')}
        </Button>
      </form>
    </li>
  )
}

export default function AdminShipping({ zones }: { zones: Zone[] }) {
  const { t } = useT()

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Shipping rates')}
        description={t(
          'Price by destination zone and chargeable weight (packaging included, volumetric weight if larger). The seeded values are placeholders until a carrier contract is signed.'
        )}
      />
      {zones.map((zone) => (
        <Card key={zone.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {t(zone.name)}
              {zone.isFallback && <Badge variant="outline">{t('everything else')}</Badge>}
            </CardTitle>
            {zone.countries.length > 0 && (
              <p className="text-xs text-ink-600">{zone.countries.join(', ')}</p>
            )}
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-line">
              {zone.rates.map((r) => (
                <PriceRow
                  key={`${r.id}:${r.priceMinor}`}
                  label={`Up to ${r.upToGrams >= 1000 ? `${r.upToGrams / 1000} kg` : `${r.upToGrams} g`}`}
                  initial={r.priceMinor}
                  url={`/admin/shipping/rates/${r.id}`}
                />
              ))}
              <PriceRow
                key={`extra:${zone.extraPerKgMinor}`}
                label={t('Each further started kg')}
                initial={zone.extraPerKgMinor}
                url={`/admin/shipping/zones/${zone.id}/extra`}
              />
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

AdminShipping.layout = 'dashboard'
AdminShipping.dashboardProps = { navItems: adminNav, title: 'Admin' }
