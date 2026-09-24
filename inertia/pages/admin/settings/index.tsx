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

type SettingRow = {
  key: string
  group: 'pricing' | 'matching' | 'orders' | 'trust' | 'fraud' | 'flags' | 'referral'
  label: string
  help: string
  min: number
  max: number
  integer: boolean
  value: number
  defaultValue: number
  overridden: boolean
  updatedAt: string | null
}

const GROUPS: Array<{ id: SettingRow['group']; title: string }> = [
  { id: 'pricing', title: 'Pricing' },
  { id: 'matching', title: 'Matching' },
  { id: 'orders', title: 'Order lifecycle' },
  { id: 'trust', title: 'Maker trust tiers' },
  { id: 'fraud', title: 'Fraud checks' },
  { id: 'referral', title: 'Invite a friend' },
  { id: 'flags', title: 'Feature flags' },
]

function SettingField({ row }: { row: SettingRow }) {
  const { t } = useT()

  const [value, setValue] = useState(String(row.value))
  const changed = Number(value) !== row.value

  return (
    <div className="grid gap-3 border-b border-ink-100 py-4 last:border-0 sm:grid-cols-[1fr_auto] sm:items-end">
      <div className="space-y-1">
        <Label htmlFor={row.key} className="flex items-center gap-2">
          {t(row.label)}
          {row.overridden && <Badge variant="outline">{t('customised')}</Badge>}
        </Label>
        <p className="text-sm text-ink-600">{t(row.help)}</p>
        <p className="text-xs text-ink-500">
          {t('Default {defaultValue} · allowed {min}–{max}', {
            defaultValue: row.defaultValue,
            min: row.min,
            max: row.max,
          })}
        </p>
      </div>
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          router.post('/admin/settings', { key: row.key, value: Number(value) })
        }}
      >
        <Input
          id={row.key}
          type="number"
          inputMode="decimal"
          step={row.integer ? 1 : 0.05}
          min={row.min}
          max={row.max}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-28"
        />
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
AdminSettings.dashboardProps = { navItems: adminNav, title: 'Admin Panel' }
