import { useState } from 'react'
import { router } from '@inertiajs/react'
import { sellerNav } from '~/lib/nav'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { PageHeader } from '~/components/page_header'
import { useT } from '~/lib/i18n'

type Props = {
  files: Array<{ id: number; name: string }>
  materials: Array<{ code: string; name: string; technology: string }>
}

const selectClass =
  'flex h-10 w-full rounded-md border border-line bg-paper-raised px-3 py-2 text-sm'

export default function RfqCreate({ files, materials }: Props) {
  const { t } = useT()

  const [f, setF] = useState({
    modelFileId: files[0] ? String(files[0].id) : '',
    title: '',
    material: materials[0]?.code ?? 'PLA',
    color: '',
    quantity: '100',
    shipCountry: 'TR',
    bidDays: '5',
    maxLeadDays: '14',
    requiredTrustTier: '0',
  })
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }))
  const field = (id: keyof typeof f, label: string, type = 'text') => (
    <div className="space-y-1">
      <Label htmlFor={`r-${id}`}>{label}</Label>
      <Input id={`r-${id}`} type={type} value={f[id]} onChange={(e) => set(id)(e.target.value)} />
    </div>
  )
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title={t('New quote request')}
        description={t('Invited makers see the size and quantity of the part, never who you are.')}
      />
      {files.length === 0 ? (
        <p className="text-ink-700">
          {t('Upload and analyse a model first, then come back here.')}
        </p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t('Job')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault()
                router.post('/rfqs', {
                  modelFileId: Number(f.modelFileId),
                  title: f.title,
                  material: f.material,
                  color: f.color || undefined,
                  quantity: Number(f.quantity),
                  shipCountry: f.shipCountry,
                  bidDays: Number(f.bidDays),
                  maxLeadDays: Number(f.maxLeadDays),
                  requiredTrustTier: Number(f.requiredTrustTier),
                })
              }}
            >
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="r-file">{t('Model')}</Label>
                <select
                  id="r-file"
                  className={selectClass}
                  value={f.modelFileId}
                  onChange={(e) => set('modelFileId')(e.target.value)}
                >
                  {files.map((file) => (
                    <option key={file.id} value={file.id}>
                      {file.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">{field('title', 'Title')}</div>
              <div className="space-y-1">
                <Label htmlFor="r-material">{t('Material')}</Label>
                <select
                  id="r-material"
                  className={selectClass}
                  value={f.material}
                  onChange={(e) => set('material')(e.target.value)}
                >
                  {materials.map((m) => (
                    <option key={m.code} value={m.code}>
                      {m.name} ({m.technology})
                    </option>
                  ))}
                </select>
              </div>
              {field('color', 'Colour (optional)')}
              {field('quantity', 'Quantity', 'number')}
              {field('shipCountry', 'Deliver to (country, 2 letters)')}
              {field('bidDays', 'Offers open for (days, 1–14)', 'number')}
              {field('maxLeadDays', 'Needed within (days after you choose)', 'number')}
              <div className="space-y-1">
                <Label htmlFor="r-tier">{t('Maker level')}</Label>
                <select
                  id="r-tier"
                  className={selectClass}
                  value={f.requiredTrustTier}
                  onChange={(e) => set('requiredTrustTier')(e.target.value)}
                >
                  <option value="0">{t('Any approved maker')}</option>
                  <option value="1">{t('Verified makers')}</option>
                  <option value="2">{t('Trusted makers')}</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={f.title.trim().length < 3}>
                  {t('Send request')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

RfqCreate.layout = 'dashboard'
RfqCreate.dashboardProps = { navItems: sellerNav, title: 'Seller' }
