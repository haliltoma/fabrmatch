import { useState } from 'react'
import { Printer } from 'lucide-react'
import { useForm, router } from '@inertiajs/react'
import { makerNav } from '~/lib/nav'
import { MoneyInput } from '~/components/money_input'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Badge } from '~/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { PageHeader } from '~/components/page_header'
import { EmptyState } from '~/components/empty_state'
import { useT } from '~/lib/i18n'

type Material = {
  id: number
  material: string
  colors: string[]
  pricePerGramMinor: number
  currency: string
  aboveReference: { missedOrders: number; referencePricePerGramMinor: number } | null
}

type PrinterData = {
  id: number
  name: string
  technology: string
  buildVolumeXMm: number
  buildVolumeYMm: number
  buildVolumeZMm: number
  isActive: boolean
  offeredProfileIds: number[]
  materials: Material[]
}

function AddPrinterForm({ onClose }: { onClose: () => void }) {
  const { t } = useT()

  const form = useForm({
    name: '',
    technology: 'FDM' as 'FDM' | 'SLA' | 'SLS',
    buildVolumeXMm: 220,
    buildVolumeYMm: 220,
    buildVolumeZMm: 250,
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    form.post('/maker/printers', { onSuccess: () => onClose() })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label htmlFor="name">{t('Printer Name')}</Label>
        <Input
          id="name"
          value={form.data.name}
          onChange={(e) => form.setData('name', e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="technology">{t('Technology')}</Label>
        <select
          id="technology"
          className="flex h-10 w-full rounded-md border border-line bg-paper-raised px-3 py-2 text-sm"
          value={form.data.technology}
          onChange={(e) => form.setData('technology', e.target.value as 'FDM' | 'SLA' | 'SLS')}
        >
          <option value="FDM">{t('FDM')}</option>
          <option value="SLA">{t('SLA')}</option>
          <option value="SLS">{t('SLS')}</option>
        </select>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label htmlFor="x">{t('X (mm)')}</Label>
          <Input
            id="x"
            type="number"
            value={form.data.buildVolumeXMm}
            onChange={(e) => form.setData('buildVolumeXMm', Number(e.target.value))}
          />
        </div>
        <div>
          <Label htmlFor="y">{t('Y (mm)')}</Label>
          <Input
            id="y"
            type="number"
            value={form.data.buildVolumeYMm}
            onChange={(e) => form.setData('buildVolumeYMm', Number(e.target.value))}
          />
        </div>
        <div>
          <Label htmlFor="z">{t('Z (mm)')}</Label>
          <Input
            id="z"
            type="number"
            value={form.data.buildVolumeZMm}
            onChange={(e) => form.setData('buildVolumeZMm', Number(e.target.value))}
          />
        </div>
      </div>
      <Button type="submit" disabled={form.processing}>
        {t('Add Printer')}
      </Button>
    </form>
  )
}

type Catalog = {
  materials: Array<{ code: string; name: string; technology: string }>
  colors: Array<{ name: string; hex: string }>
}

function AddMaterialForm({
  printerId,
  technology,
  catalog,
  onClose,
}: {
  printerId: number
  technology: string
  catalog: Catalog
  onClose: () => void
}) {
  const { t } = useT()

  const options = catalog.materials.filter((m) => m.technology === technology)
  const [material, setMaterial] = useState(options[0]?.code ?? '')
  const [colors, setColors] = useState<string[]>([])
  const [pricePerGramMinor, setPrice] = useState<number | null>(null)

  const toggle = (name: string) =>
    setColors((list) => (list.includes(name) ? list.filter((c) => c !== name) : [...list, name]))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    router.post(
      `/maker/printers/${printerId}/materials`,
      { material, colors, pricePerGramMinor: pricePerGramMinor ?? 0 },
      { onSuccess: () => onClose() }
    )
  }

  if (options.length === 0) {
    return (
      <p className="text-ink-700">
        {t('No {technology} materials are offered yet.', { technology })}
      </p>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label htmlFor="material">{t('Material')}</Label>
        <select
          id="material"
          className="h-10 w-full rounded-md border border-line bg-paper-raised px-2 text-sm"
          value={material}
          onChange={(e) => setMaterial(e.target.value)}
        >
          {options.map((m) => (
            <option key={m.code} value={m.code}>
              {m.name}
            </option>
          ))}
        </select>
      </div>
      <fieldset>
        <legend className="mb-1 text-sm font-medium">{t('Colours you can print')}</legend>
        <div className="flex flex-wrap gap-2">
          {catalog.colors.map((c) => (
            <label
              key={c.name}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-line px-2 py-1 text-sm has-[:checked]:border-ink-900 has-[:checked]:bg-paper-sunken"
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={colors.includes(c.name)}
                onChange={() => toggle(c.name)}
              />
              <span
                className="h-4 w-4 rounded-full border border-line"
                style={{ backgroundColor: c.hex }}
                aria-hidden
              />
              {c.name}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <Label htmlFor="price">{t('Your price per gram')}</Label>
        <MoneyInput id="price" required valueMinor={pricePerGramMinor} onChange={setPrice} />
      </div>
      <Button type="submit" disabled={colors.length === 0 || pricePerGramMinor === null}>
        {t('Add Material')}
      </Button>
    </form>
  )
}

type ProfileOption = { id: number; name: string; technology: string }

function ProfilePicker({ printer, profiles }: { printer: PrinterData; profiles: ProfileOption[] }) {
  const { t } = useT()

  const options = profiles.filter((p) => p.technology === printer.technology)
  const [selected, setSelected] = useState<number[]>(printer.offeredProfileIds)
  if (options.length === 0) return null
  const toggle = (id: number) =>
    setSelected((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]))
  const changed =
    selected.length !== printer.offeredProfileIds.length ||
    selected.some((id) => !printer.offeredProfileIds.includes(id))

  return (
    <div className="mt-4 space-y-2 border-t border-line pt-4">
      <h3 className="text-sm font-medium">{t('Print profiles you offer')}</h3>
      <div className="flex flex-wrap gap-2">
        {options.map((p) => (
          <label
            key={p.id}
            className="flex cursor-pointer items-center gap-2 rounded-md border border-line px-2 py-1 text-sm has-[:checked]:border-ink-900 has-[:checked]:bg-paper-sunken"
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={selected.includes(p.id)}
              onChange={() => toggle(p.id)}
            />
            {p.name}
          </label>
        ))}
      </div>
      <Button
        size="sm"
        variant="outline"
        disabled={!changed}
        onClick={() =>
          router.post(`/maker/printers/${printer.id}/profiles`, { profileIds: selected })
        }
      >
        {t('Save profiles')}
      </Button>
    </div>
  )
}

export default function PrintersIndex({
  printers,
  catalog,
  profiles,
}: {
  printers: PrinterData[]
  catalog: Catalog
  profiles: ProfileOption[]
}) {
  const { t } = useT()

  const [showAddPrinter, setShowAddPrinter] = useState(false)
  const [addMaterialFor, setAddMaterialFor] = useState<number | null>(null)

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('My printers')}
        description={t('Machines and materials decide which orders can be matched to you.')}
        action={<Button onClick={() => setShowAddPrinter(true)}>{t('Add printer')}</Button>}
      />

      {printers.length === 0 && (
        <EmptyState
          icon={Printer}
          title={t('No printers yet')}
          description={t(
            'Add a machine with its build volume and materials. Orders are only matched to printers that fit.'
          )}
          action={
            <Button onClick={() => setShowAddPrinter(true)}>{t('Add your first printer')}</Button>
          }
        />
      )}

      <div className="grid gap-4">
        {printers.map((printer) => (
          <Card key={printer.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">{printer.name}</CardTitle>
                <p className="text-sm text-ink-600">
                  {t('{technology} · {buildVolumeXMm}×{buildVolumeYMm}× {buildVolumeZMm} mm', {
                    technology: printer.technology,
                    buildVolumeXMm: printer.buildVolumeXMm,
                    buildVolumeYMm: printer.buildVolumeYMm,
                    buildVolumeZMm: printer.buildVolumeZMm,
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={printer.isActive ? 'success' : 'secondary'}>
                  {printer.isActive ? t('Active') : t('Inactive')}
                </Badge>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    router.post(`/maker/printers/${printer.id}/toggle`)
                  }}
                >
                  <Button variant="outline" size="sm" type="submit">
                    {printer.isActive ? t('Deactivate') : t('Activate')}
                  </Button>
                </form>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">{t('Materials')}</h3>
                  <Button variant="outline" size="sm" onClick={() => setAddMaterialFor(printer.id)}>
                    {t('Add Material')}
                  </Button>
                </div>
                {printer.materials.length === 0 ? (
                  <p className="text-sm text-ink-600">{t('No materials configured.')}</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {printer.materials.map((mat) => (
                      <div
                        key={mat.id}
                        className="flex items-center justify-between rounded-md border border-line p-3"
                      >
                        <div>
                          <span className="font-medium">{mat.material}</span>
                          <span className="ml-2 text-sm text-ink-600">
                            {(mat.pricePerGramMinor / 100).toFixed(2)} {mat.currency}/g
                          </span>
                          {mat.aboveReference && (
                            <p className="mt-1 text-xs text-danger">
                              {t(
                                'Above the platform price of {price} {currency}/g, so you are not matched',
                                {
                                  price: (
                                    mat.aboveReference.referencePricePerGramMinor / 100
                                  ).toFixed(2),
                                  currency: mat.currency,
                                }
                              )}
                              {mat.aboveReference.missedOrders > 0
                                ? ` — ${
                                    mat.aboveReference.missedOrders === 1
                                      ? t('{count} order missed in 30 days.', { count: 1 })
                                      : t('{count} orders missed in 30 days.', {
                                          count: mat.aboveReference.missedOrders,
                                        })
                                  }`
                                : '.'}
                            </p>
                          )}
                          <div className="mt-1 flex gap-1">
                            {mat.colors.map((c) => (
                              <Badge key={c} variant="outline" className="text-xs">
                                {c}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <form
                          onSubmit={(e) => {
                            e.preventDefault()
                            router.delete(`/maker/printers/${printer.id}/materials/${mat.id}`)
                          }}
                        >
                          <Button variant="ghost" size="sm" type="submit">
                            {t('Remove')}
                          </Button>
                        </form>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <ProfilePicker printer={printer} profiles={profiles} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showAddPrinter} onOpenChange={setShowAddPrinter}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Add Printer')}</DialogTitle>
          </DialogHeader>
          <AddPrinterForm onClose={() => setShowAddPrinter(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={addMaterialFor !== null} onOpenChange={() => setAddMaterialFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Add Material')}</DialogTitle>
          </DialogHeader>
          {addMaterialFor !== null && (
            <AddMaterialForm
              printerId={addMaterialFor}
              technology={printers.find((p) => p.id === addMaterialFor)?.technology ?? 'FDM'}
              catalog={catalog}
              onClose={() => setAddMaterialFor(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

PrintersIndex.layout = 'dashboard'
PrintersIndex.dashboardProps = { navItems: makerNav, title: 'Manufacturer Panel' }
