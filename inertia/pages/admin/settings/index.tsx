import { useState } from 'react'
import { router } from '@inertiajs/react'
import { adminNav } from '~/lib/nav'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { PageHeader } from '~/components/page_header'
import { useT } from '~/lib/i18n'
import { minorToInput, parseMoneyToMinor } from '~/lib/money'
import { formatMoney, formatNumber } from '~/lib/format'

type SettingRow = {
  key: string
  group:
    | 'pricing'
    | 'makerPay'
    | 'matching'
    | 'orders'
    | 'trust'
    | 'fraud'
    | 'flags'
    | 'referral'
    | 'payouts'
  label: string
  help: string
  min: number
  max: number
  integer: boolean
  kind?: 'number' | 'percent' | 'money' | 'toggle' | 'choice'
  choices?: Array<{ value: number; label: string }>
  value: number
  defaultValue: number
  overridden: boolean
  updatedAt: string | null
}

const GROUPS: Array<{ id: SettingRow['group']; title: string }> = [
  { id: 'pricing', title: 'Pricing' },
  { id: 'makerPay', title: 'Maker pay' },
  { id: 'matching', title: 'Matching' },
  { id: 'orders', title: 'Order lifecycle' },
  { id: 'trust', title: 'Maker trust tiers' },
  { id: 'fraud', title: 'Fraud checks' },
  { id: 'referral', title: 'Invite a friend' },
  { id: 'payouts', title: 'Payouts and tax' },
  { id: 'flags', title: 'Feature flags' },
]

/** Percent and money are stored ×100 (basis points, minor units); both are typed like "12,5". */
const scaled = (kind: SettingRow['kind']) => kind === 'percent' || kind === 'money'

function shown(
  row: SettingRow,
  value: number,
  t: (s: string, v?: Record<string, string | number>) => string
) {
  switch (row.kind) {
    case 'percent':
      return t('{value}%', { value: formatNumber(value / 100) })
    case 'money':
      return formatMoney(value)
    case 'toggle':
      return value === 1 ? t('On') : t('Off')
    case 'choice':
      return t(row.choices?.find((c) => c.value === value)?.label ?? String(value))
    default:
      return String(value)
  }
}

function SettingField({ row }: { row: SettingRow }) {
  const { t } = useT()

  const [value, setValue] = useState(
    row.kind === 'percent'
      ? minorToInput(row.value).replace(/\.00$/, '')
      : row.kind === 'money'
        ? minorToInput(row.value)
        : String(row.value)
  )
  const stored = scaled(row.kind)
    ? parseMoneyToMinor(value)
    : value.trim() === ''
      ? null
      : Number(value)
  const changed = stored !== null && stored !== row.value
  const options =
    row.kind === 'toggle'
      ? [
          { value: 0, label: 'Off' },
          { value: 1, label: 'On' },
        ]
      : row.kind === 'choice'
        ? (row.choices ?? [])
        : null

  return (
    <div className="grid gap-3 border-b border-line py-4 last:border-0 sm:grid-cols-[1fr_auto] sm:items-end">
      <div className="space-y-1">
        <Label htmlFor={row.key} className="flex items-center gap-2">
          {t(row.label)}
          {row.overridden && <Badge variant="outline">{t('customised')}</Badge>}
        </Label>
        <p className="text-sm text-ink-600">{t(row.help)}</p>
        <p className="text-xs text-ink-500">
          {options
            ? t('Default {defaultValue}', { defaultValue: shown(row, row.defaultValue, t) })
            : t('Default {defaultValue} · allowed {min}–{max}', {
                defaultValue: shown(row, row.defaultValue, t),
                min: shown(row, row.min, t),
                max: shown(row, row.max, t),
              })}
        </p>
      </div>
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (stored !== null) router.post('/admin/settings', { key: row.key, value: stored })
        }}
      >
        {options ? (
          <select
            id={row.key}
            className="h-9 rounded-md border border-line bg-paper-raised px-2 text-sm"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          >
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {t(o.label)}
              </option>
            ))}
          </select>
        ) : (
          <div className="flex items-center gap-1">
            <Input
              id={row.key}
              type={scaled(row.kind) ? 'text' : 'number'}
              inputMode="decimal"
              step={row.integer ? 1 : 0.05}
              min={scaled(row.kind) ? undefined : row.min}
              max={scaled(row.kind) ? undefined : row.max}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-9 w-28"
            />
            {row.kind === 'percent' && <span className="text-sm text-ink-500">%</span>}
            {row.kind === 'money' && <span className="text-sm text-ink-500">TRY</span>}
          </div>
        )}
        <Button type="submit" size="sm" disabled={!changed}>
          {t('Save')}
        </Button>
        {row.overridden && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => router.post('/admin/settings/reset', { key: row.key })}
          >
            {t('Reset')}
          </Button>
        )}
      </form>
    </div>
  )
}

export default function AdminSettings({ settings }: { settings: SettingRow[] }) {
  const { t } = useT()

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Settings')}
        description={t(
          'Platform rules that change without a deploy. Every change is written to the audit log.'
        )}
      />
      {GROUPS.map((group) => (
        <Card key={group.id}>
          <CardHeader>
            <CardTitle>{t(group.title)}</CardTitle>
          </CardHeader>
          <CardContent>
            {settings
              .filter((s) => s.group === group.id)
              .map((row) => (
                <SettingField key={`${row.key}:${row.value}`} row={row} />
              ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

AdminSettings.layout = 'dashboard'
AdminSettings.dashboardProps = { navItems: adminNav, title: 'Admin' }
