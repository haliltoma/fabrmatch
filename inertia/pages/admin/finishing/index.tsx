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

type Option = {
  id: number
  code: string
  name: string
  description: string
  priceMinor: number
  extraDays: number
  materials: string[] | null
  isActive: boolean
}

function Row({ option }: { option: Option }) {
  const { t } = useT()

  const [price, setPrice] = useState((option.priceMinor / 100).toFixed(2))
  const [days, setDays] = useState(String(option.extraDays))
  const changed =
    Math.round(Number(price) * 100) !== option.priceMinor || Number(days) !== option.extraDays
  return (
    <li className="flex flex-wrap items-end justify-between gap-3 py-3">
      <div className="space-y-1">
        <p className="font-medium text-ink-900">
          {option.name}{' '}
          <span className="tabular font-mono text-xs text-ink-600">{option.code}</span>{' '}
          <Badge variant={option.isActive ? 'success' : 'secondary'}>
            {option.isActive ? 'On' : 'Off'}
          </Badge>
        </p>
        <p className="text-sm text-ink-700">{option.description}</p>
        <p className="text-xs text-ink-600">
          {option.materials
            ? t('Only for {materials}', { materials: option.materials.join(', ') })
            : t('Any material')}{' '}
          · {t('now {amount} per unit', { amount: formatMoney(option.priceMinor, 'TRY') })} ·{' '}
          {t('+{n} production days', { n: option.extraDays })}
        </p>
      </div>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          router.post(`/admin/finishing/${option.id}`, {
            price: Number(price),
            extraDays: Number(days),
          })
        }}
      >
        <div className="space-y-1">
          <Label htmlFor={`fp-${option.id}`}>{t('Price (TRY)')}</Label>
          <Input
            id={`fp-${option.id}`}
            type="number"
            step="0.01"
            min="0"
            className="h-9 w-28"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`fd-${option.id}`}>{t('Extra days')}</Label>
          <Input
            id={`fd-${option.id}`}
            type="number"
            step="1"
            min="0"
            max="30"
            className="h-9 w-20"
            value={days}
            onChange={(e) => setDays(e.target.value)}
          />
        </div>
        <Button type="submit" size="sm" disabled={!changed}>
          {t('Save')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            router.post(`/admin/finishing/${option.id}`, { isActive: !option.isActive })
          }
        >
          {option.isActive ? t('Turn off') : t('Turn on')}
        </Button>
      </form>
    </li>
  )
}

export default function AdminFinishing({ options }: { options: Option[] }) {
  const { t } = useT()

  const [f, setF] = useState({ code: '', name: '', description: '', price: '', materials: '' })
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }))
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={t('Finishing options')}
        description={t(
          'Sanding, priming, painting… A price is per unit and goes to the maker, so the platform fee applies to it. Makers choose which ones they offer.'
        )}
      />
      <Card>
        <CardHeader>
          <CardTitle>{t('Options')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-line">
            {options.map((o) => (
              <Row key={`${o.id}:${o.priceMinor}:${o.extraDays}:${o.isActive}`} option={o} />
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t('New option')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault()
              const body: Record<string, string | number> = {
                code: f.code,
                name: f.name,
                price: Number(f.price),
              }
              if (f.description) body.description = f.description
              if (f.materials) body.materials = f.materials
              router.post('/admin/finishing', body)
            }}
          >
            {(
              [
                ['code', 'Code'],
                ['name', 'Name'],
                ['price', 'Price per unit (TRY)'],
                ['materials', 'Only for materials (comma separated, optional)'],
                ['description', 'Description'],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-1">
                <Label htmlFor={`nf-${key}`}>{t(label)}</Label>
                <Input
                  id={`nf-${key}`}
                  type={key === 'price' ? 'number' : 'text'}
                  value={f[key]}
                  onChange={(e) => set(key)(e.target.value)}
                />
              </div>
            ))}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={!f.code.trim() || !f.name.trim() || f.price === ''}>
                {t('Add option')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

AdminFinishing.layout = 'dashboard'
AdminFinishing.dashboardProps = { navItems: adminNav, title: 'Admin Panel' }
