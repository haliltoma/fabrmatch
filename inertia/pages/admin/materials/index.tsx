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

type MaterialRow = {
  id: string
  code: string
  name: string
  technology: 'FDM' | 'SLA' | 'SLS'
  isActive: boolean
}
type ColorRow = { id: string; name: string; hex: string; isActive: boolean }

function AddMaterial() {
  const { t } = useT()

  const [form, setForm] = useState({ code: '', name: '', technology: 'FDM' })
  return (
    <form
      className="flex flex-wrap items-end gap-2 border-t border-line pt-4"
      onSubmit={(e) => {
        e.preventDefault()
        router.post('/admin/materials', form, {
          onSuccess: () => setForm({ code: '', name: '', technology: 'FDM' }),
        })
      }}
    >
      <div className="space-y-1">
        <Label htmlFor="m-code">{t('Code')}</Label>
        <Input
          id="m-code"
          className="w-28"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="m-name">{t('Name')}</Label>
        <Input
          id="m-name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="m-tech">{t('Technology')}</Label>
        <select
          id="m-tech"
          className="h-10 rounded-md border border-line bg-paper-raised px-2 text-sm"
          value={form.technology}
          onChange={(e) => setForm({ ...form, technology: e.target.value })}
        >
          {['FDM', 'SLA', 'SLS'].map((tech) => (
            <option key={tech}>{tech}</option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={!form.code.trim() || !form.name.trim()}>
        {t('Add material')}
      </Button>
    </form>
  )
}

function AddColor() {
  const { t } = useT()

  const [form, setForm] = useState({ name: '', hex: '#1E5FBF' })
  return (
    <form
      className="flex flex-wrap items-end gap-2 border-t border-line pt-4"
      onSubmit={(e) => {
        e.preventDefault()
        router.post('/admin/colors', form, { onSuccess: () => setForm({ ...form, name: '' }) })
      }}
    >
      <div className="space-y-1">
        <Label htmlFor="c-name">{t('Name')}</Label>
        <Input
          id="c-name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="c-hex">{t('Swatch')}</Label>
        <input
          id="c-hex"
          type="color"
          className="h-10 w-14 rounded-md border border-line"
          value={form.hex}
          onChange={(e) => setForm({ ...form, hex: e.target.value })}
        />
      </div>
      <Button type="submit" disabled={!form.name.trim()}>
        {t('Add colour')}
      </Button>
    </form>
  )
}

export default function AdminMaterials({
  materials,
  colors,
}: {
  materials: MaterialRow[]
  colors: ColorRow[]
}) {
  const { t } = useT()

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Materials & colours')}
        description={t(
          'Makers pick from this list. Retiring an entry keeps existing offers but stops new picks.'
        )}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('Materials')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="divide-y divide-line">
              {materials.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-2">
                  <div>
                    <span className="font-medium text-ink-900">{m.code}</span>{' '}
                    <span className="text-sm text-ink-600">{m.name}</span>{' '}
                    <Badge variant="outline">{m.technology}</Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      router.post(`/admin/materials/${m.id}/toggle`, { isActive: !m.isActive })
                    }
                  >
                    {m.isActive ? t('Retire') : t('Restore')}
                  </Button>
                </li>
              ))}
            </ul>
            <AddMaterial />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('Colours')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="divide-y divide-line">
              {colors.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-5 w-5 rounded-full border border-line"
                      style={{ backgroundColor: c.hex }}
                      aria-hidden
                    />
                    <span className={c.isActive ? 'text-ink-900' : 'text-ink-500 line-through'}>
                      {c.name}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      router.post(`/admin/colors/${c.id}/toggle`, { isActive: !c.isActive })
                    }
                  >
                    {c.isActive ? t('Retire') : t('Restore')}
                  </Button>
                </li>
              ))}
            </ul>
            <AddColor />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

AdminMaterials.layout = 'dashboard'
AdminMaterials.dashboardProps = { navItems: adminNav, title: 'Admin' }
