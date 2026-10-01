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

type Profile = {
  id: string
  code: string
  name: string
  technology: string
  layerHeightMicron: number
  infillPercent: number
  timeFactorBps: number
  postProcess: string | null
  isActive: boolean
}

function AddProfile() {
  const { t } = useT()

  const blank = {
    code: '',
    name: '',
    technology: 'FDM',
    layerHeightMicron: '200',
    infillPercent: '20',
    timeFactorBps: '10000',
    postProcess: '',
  }
  const [f, setF] = useState(blank)
  const field = (key: keyof typeof blank, label: string, width = 'w-32') => (
    <div className="space-y-1">
      <Label htmlFor={`p-${key}`}>{t(label)}</Label>
      <Input
        id={`p-${key}`}
        className={width}
        value={f[key]}
        onChange={(e) => setF({ ...f, [key]: e.target.value })}
      />
    </div>
  )
  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        router.post(
          '/admin/profiles',
          {
            ...f,
            layerHeightMicron: Number(f.layerHeightMicron),
            infillPercent: Number(f.infillPercent),
            timeFactorBps: Number(f.timeFactorBps),
            postProcess: f.postProcess || undefined,
          },
          { onSuccess: () => setF(blank) }
        )
      }}
    >
      {field('code', 'Code')}
      {field('name', 'Name', 'w-64')}
      <div className="space-y-1">
        <Label htmlFor="p-tech">{t('Technology')}</Label>
        <select
          id="p-tech"
          className="h-10 rounded-md border border-line bg-paper-raised px-2 text-sm"
          value={f.technology}
          onChange={(e) => setF({ ...f, technology: e.target.value })}
        >
          {['FDM', 'SLA', 'SLS'].map((tech) => (
            <option key={tech}>{tech}</option>
          ))}
        </select>
      </div>
      {field('layerHeightMicron', 'Layer (µm)', 'w-24')}
      {field('infillPercent', 'Infill %', 'w-20')}
      {field('timeFactorBps', 'Time factor (bps)', 'w-28')}
      {field('postProcess', 'Post-processing', 'w-48')}
      <Button type="submit" disabled={!f.code.trim() || !f.name.trim()}>
        {t('Add profile')}
      </Button>
    </form>
  )
}

export default function AdminProfiles({ profiles }: { profiles: Profile[] }) {
  const { t } = useT()

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Print profiles')}
        description={t(
          'Quality presets buyers pick. A maker only receives orders for profiles they declared. Time factor 10000 = baseline speed.'
        )}
      />
      <Card>
        <CardHeader>
          <CardTitle>{t('Profiles')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <ul className="divide-y divide-line">
            {profiles.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p
                    className={
                      p.isActive ? 'font-medium text-ink-900' : 'text-ink-500 line-through'
                    }
                  >
                    {p.name} <Badge variant="outline">{p.technology}</Badge>
                  </p>
                  <p className="text-xs text-ink-600">
                    {p.code} · {p.layerHeightMicron} µm · {p.infillPercent}% infill · time ×
                    {(p.timeFactorBps / 10000).toFixed(2)}
                    {p.postProcess ? ` · ${p.postProcess}` : ''}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    router.post(`/admin/profiles/${p.id}/toggle`, { isActive: !p.isActive })
                  }
                >
                  {p.isActive ? t('Retire') : t('Restore')}
                </Button>
              </li>
            ))}
          </ul>
          <AddProfile />
        </CardContent>
      </Card>
    </div>
  )
}

AdminProfiles.layout = 'dashboard'
AdminProfiles.dashboardProps = { navItems: adminNav, title: 'Admin' }
