import { useState } from 'react'
import { router } from '@inertiajs/react'
import { adminNav } from '~/lib/nav'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { PageHeader } from '~/components/page_header'
import { formatDate, formatMoney } from '~/lib/format'
import { useT } from '~/lib/i18n'

type Coupon = {
  id: number
  code: string
  kind: 'percent' | 'fixed'
  value: number
  minOrderMinor: number
  maxDiscountMinor: number | null
  maxRedemptions: number | null
  perUserLimit: number
  firstOrderOnly: boolean
  endsAt: string | null
  isActive: boolean
  note: string | null
  used: number
}

const describe = (c: Coupon) =>
  c.kind === 'percent' ? `${c.value / 100}% off items` : `${formatMoney(c.value, 'TRY')} off`

function CreateForm() {
  const { t } = useT()

  const [f, setF] = useState({
    code: '',
    kind: 'percent',
    value: '',
    minOrder: '',
    maxDiscount: '',
    maxRedemptions: '',
    perUserLimit: '1',
    endsAt: '',
    firstOrderOnly: false,
    note: '',
  })
  const set = (k: keyof typeof f) => (v: string | boolean) => setF((x) => ({ ...x, [k]: v }))
  const text = (id: keyof typeof f, label: string, props: Record<string, string> = {}) => (
    <div className="space-y-1">
      <Label htmlFor={`c-${id}`}>{t(label)}</Label>
      <Input
        id={`c-${id}`}
        value={String(f[id])}
        onChange={(e) => set(id)(e.target.value)}
        {...props}
      />
    </div>
  )
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('New coupon')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault()
            const body: Record<string, string | number | boolean> = {
              code: f.code,
              kind: f.kind,
              value: Number(f.value),
              perUserLimit: Number(f.perUserLimit || 1),
              firstOrderOnly: f.firstOrderOnly,
            }
            if (f.minOrder) body.minOrder = Number(f.minOrder)
            if (f.maxDiscount) body.maxDiscount = Number(f.maxDiscount)
            if (f.maxRedemptions) body.maxRedemptions = Number(f.maxRedemptions)
            if (f.endsAt) body.endsAt = f.endsAt
            if (f.note) body.note = f.note
            router.post('/admin/coupons', body)
          }}
        >
          {text('code', 'Code')}
          <div className="space-y-1">
            <Label htmlFor="c-kind">{t('Type')}</Label>
            <select
              id="c-kind"
              className="h-9 w-full rounded-md border border-line bg-paper-raised px-2"
              value={f.kind}
              onChange={(e) => set('kind')(e.target.value)}
            >
              <option value="percent">{t('Percent of items')}</option>
              <option value="fixed">{t('Fixed amount (TRY)')}</option>
            </select>
          </div>
          {text(
            'value',
            f.kind === 'percent' ? t('Percent (e.g. 10)') : t('Amount in TRY (e.g. 50)'),
            {
              type: 'number',
              step: '0.01',
            }
          )}
          {text('minOrder', 'Minimum items total (TRY, optional)', { type: 'number' })}
          {text('maxDiscount', 'Largest discount (TRY, optional)', { type: 'number' })}
          {text('maxRedemptions', 'Total uses allowed (optional)', { type: 'number' })}
          {text('perUserLimit', 'Uses per buyer', { type: 'number' })}
          {text('endsAt', 'Last day (optional)', { type: 'date' })}
          {text('note', 'Note (internal)')}
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={f.firstOrderOnly}
              onChange={(e) => set('firstOrderOnly')(e.target.checked)}
            />
            {t('First order only')}
          </label>
          <p className="text-xs text-ink-600 sm:col-span-2">
            {t(
              'A coupon is paid out of the platform fee of the order. Makers and sellers still get their full share, and a discount can never be larger than that fee.'
            )}
          </p>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={f.code.trim().length < 3 || f.value === ''}>
              {t('Create coupon')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default function AdminCoupons({ coupons }: { coupons: Coupon[] }) {
  const { t } = useT()

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={t('Coupons')}
        description={t('Discount codes funded from the platform fee.')}
      />
      <CreateForm />
      <Card>
        <CardHeader>
          <CardTitle>{t('All coupons')}</CardTitle>
        </CardHeader>
        <CardContent>
          {coupons.length === 0 ? (
            <p className="text-ink-700">{t('No coupons yet.')}</p>
          ) : (
            <ul className="divide-y divide-line">
              {coupons.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="tabular font-mono text-sm text-ink-900">
                      {c.code}{' '}
                      <Badge variant={c.isActive ? 'success' : 'secondary'}>
                        {c.isActive ? 'On' : 'Off'}
                      </Badge>
                    </p>
                    <p className="text-sm text-ink-700">{describe(c)}</p>
                    <p className="text-xs text-ink-600">
                      Used {c.used}
                      {c.maxRedemptions !== null ? ` of ${c.maxRedemptions}` : ''} ·{' '}
                      {c.perUserLimit} per buyer
                      {c.firstOrderOnly ? ' · first order only' : ''}
                      {c.minOrderMinor > 0 ? ` · min ${formatMoney(c.minOrderMinor, 'TRY')}` : ''}
                      {c.endsAt ? ` · until ${formatDate(c.endsAt)}` : ''}
                    </p>
                    {c.note && <p className="text-xs text-ink-600">{c.note}</p>}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      router.post(`/admin/coupons/${c.id}/toggle`, { active: !c.isActive })
                    }
                  >
                    {c.isActive ? t('Turn off') : t('Turn on')}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

AdminCoupons.layout = 'dashboard'
AdminCoupons.dashboardProps = { navItems: adminNav, title: 'Admin' }
