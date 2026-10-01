import { useEffect, useState } from 'react'
import { Package } from 'lucide-react'
import { useForm, router } from '@inertiajs/react'
import { sellerNav } from '~/lib/nav'
import { formatMoney } from '~/lib/format'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Badge } from '~/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { PageHeader } from '~/components/page_header'
import { EmptyState } from '~/components/empty_state'
import { useT } from '~/lib/i18n'

type ProductData = {
  id: number
  title: string
  description: string | null
  currency: string
  marginBps: number
  status: string
  catalogProduct: { id: number; title: string } | null
}

type CatalogOption = {
  id: number
  title: string
  allowedMaterials: string[]
}

type MarginOption = {
  material: string
  buyerPriceMinor: number
  sellerEarnsMinor: number
  costMinor: number
}

/** Live "what does this margin mean in money" for the chosen catalog design. */
function MarginPreview({
  catalogProductId,
  marginPercent,
}: {
  catalogProductId: number | null
  marginPercent: string
}) {
  const { t } = useT()

  const [options, setOptions] = useState<MarginOption[]>([])
  const bps = marginPercent === '' ? null : Math.round(Number(marginPercent) * 100)
  const enabled = !!catalogProductId && bps !== null && !Number.isNaN(bps) && bps >= 0

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/seller/margin-preview?catalogProductId=${catalogProductId}&marginBps=${bps}`,
          { signal: controller.signal, headers: { accept: 'application/json' } }
        )
        if (res.ok) setOptions(((await res.json()) as { options: MarginOption[] }).options)
      } catch {
        /* aborted or offline: keep the last numbers */
      }
    }, 250)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [catalogProductId, bps, enabled])

  if (!enabled || options.length === 0) return null
  return (
    <div className="rounded-md border border-line bg-paper-sunken p-3 text-sm" aria-live="polite">
      <p className="mb-2 font-medium text-ink-900">{t('What this margin means, per piece sold')}</p>
      <ul className="space-y-1">
        {options.map((o) => (
          <li key={o.material} className="flex justify-between gap-3">
            <span className="text-ink-700">
              {t('{material}: buyer pays {amount}', {
                material: o.material,
                amount: formatMoney(o.buyerPriceMinor),
              })}
            </span>
            <span className="tabular font-medium text-ink-900">
              {t('you keep {amount}', { amount: formatMoney(o.sellerEarnsMinor) })}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-ink-600">
        {t('Delivery within Türkiye; the rest covers production, shipping and the platform fee.')}
      </p>
    </div>
  )
}

function SampleOrderForm({ productId, onClose }: { productId: number; onClose: () => void }) {
  const { t } = useT()

  const [a, setA] = useState({
    fullName: '',
    line1: '',
    city: '',
    postalCode: '',
    country: 'TR',
    phone: '',
  })
  const [material, setMaterial] = useState('PLA')
  const set = (k: keyof typeof a) => (v: string) => setA((x) => ({ ...x, [k]: v }))
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        router.post(
          `/seller/products/${productId}/sample`,
          { material, shippingAddress: { ...a, phone: a.phone || undefined } },
          { onSuccess: () => onClose() }
        )
      }}
    >
      <p className="text-sm text-ink-700">
        {t('One piece at production cost, no margin. Check the print before you sell it.')}
      </p>
      <div>
        <Label htmlFor={`sm-mat-${productId}`}>{t('Material')}</Label>
        <Input
          id={`sm-mat-${productId}`}
          value={material}
          onChange={(e) => setMaterial(e.target.value.toUpperCase())}
        />
      </div>
      {(
        [
          ['fullName', 'Full name'],
          ['line1', 'Address'],
          ['city', 'City'],
          ['postalCode', 'Postal code'],
          ['country', 'Country (2 letters)'],
          ['phone', 'Phone (for the courier)'],
        ] as const
      ).map(([key, label]) => (
        <div key={key}>
          <Label htmlFor={`sm-${key}-${productId}`}>{label}</Label>
          <Input
            id={`sm-${key}-${productId}`}
            value={a[key]}
            onChange={(e) => set(key)(e.target.value)}
          />
        </div>
      ))}
      <Button type="submit">{t('Order sample')}</Button>
    </form>
  )
}

function AddProductForm({
  catalogProducts,
  onClose,
}: {
  catalogProducts: CatalogOption[]
  onClose: () => void
}) {
  const { t } = useT()

  const form = useForm({
    catalogProductId: '' as string,
    title: '',
    description: '',
    marginPercent: '',
    minMakerTier: '0',
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    router.post(
      '/seller/products',
      {
        catalogProductId: form.data.catalogProductId
          ? Number(form.data.catalogProductId)
          : undefined,
        title: form.data.title,
        description: form.data.description || undefined,
        marginBps: form.data.marginPercent
          ? Math.round(Number(form.data.marginPercent) * 100)
          : undefined,
        minMakerTier: Number(form.data.minMakerTier),
      },
      { onSuccess: () => onClose() }
    )
  }

  function onCatalogChange(catId: string) {
    form.setData('catalogProductId', catId)
    if (catId) {
      const cat = catalogProducts.find((c) => c.id === Number(catId))
      if (cat) form.setData('title', cat.title)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label htmlFor="catalog">{t('From Catalog (optional)')}</Label>
        <select
          id="catalog"
          className="flex h-10 w-full rounded-md border border-line bg-paper-raised px-3 py-2 text-sm"
          value={form.data.catalogProductId}
          onChange={(e) => onCatalogChange(e.target.value)}
        >
          <option value="">{t('Custom product')}</option>
          {catalogProducts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="title">{t('Title')}</Label>
        <Input
          id="title"
          value={form.data.title}
          onChange={(e) => form.setData('title', e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="description">{t('Description')}</Label>
        <textarea
          id="description"
          className="flex min-h-20 w-full rounded-md border border-line bg-paper-raised px-3 py-2 text-sm"
          value={form.data.description}
          onChange={(e) => form.setData('description', e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="margin">{t('Your margin (%)')}</Label>
        <Input
          id="margin"
          type="number"
          min="0"
          max="100"
          step="0.5"
          placeholder={t('Leave empty for your default')}
          value={form.data.marginPercent}
          onChange={(e) => form.setData('marginPercent', e.target.value)}
        />
        <p className="mt-1 text-xs text-ink-600">
          {t('Added on top of production cost and fees. Buyers see the final price.')}
        </p>
      </div>
      <div>
        <Label htmlFor="tier">{t('Maker level')}</Label>
        <select
          id="tier"
          className="flex h-10 w-full rounded-md border border-line bg-paper-raised px-3 py-2 text-sm"
          value={form.data.minMakerTier}
          onChange={(e) => form.setData('minMakerTier', e.target.value)}
        >
          <option value="0">{t('Any approved maker')}</option>
          <option value="1">{t('Verified makers and above')}</option>
          <option value="2">{t('Trusted makers and above')}</option>
          <option value="3">{t('Partners only')}</option>
        </select>
        <p className="mt-1 text-xs text-ink-600">
          {t(
            'Higher levels mean fewer makers can take your orders, so matching may take longer. You never see who prints.'
          )}
        </p>
      </div>
      <MarginPreview
        catalogProductId={form.data.catalogProductId ? Number(form.data.catalogProductId) : null}
        marginPercent={form.data.marginPercent}
      />
      <Button type="submit" disabled={form.processing}>
        {t('Create Product')}
      </Button>
    </form>
  )
}

const STATUS_COLORS: Record<string, 'success' | 'secondary' | 'warning'> = {
  active: 'success',
  draft: 'secondary',
  archived: 'warning',
}

export default function SellerProductsIndex({
  products,
  catalogProducts,
}: {
  products: ProductData[]
  catalogProducts: CatalogOption[]
}) {
  const { t } = useT()

  const [showAdd, setShowAdd] = useState(false)
  const [sampleFor, setSampleFor] = useState<number | null>(null)

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('My products')}
        description={t(
          'Listed products appear in the shop. Buyers pay the computed price; you keep your margin.'
        )}
        action={<Button onClick={() => setShowAdd(true)}>{t('Add product')}</Button>}
      />

      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title={t('Nothing listed yet')}
          description={t(
            'Pick a ready-made design from the catalog, set your margin, and it goes live in the shop.'
          )}
          action={<Button onClick={() => setShowAdd(true)}>{t('Add your first product')}</Button>}
        />
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
          {products.map((product) => (
            <Card key={product.id}>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">{product.title}</CardTitle>
                  {product.catalogProduct && (
                    <p className="text-xs text-ink-600">
                      {t('From catalog: {title}', { title: product.catalogProduct.title })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_COLORS[product.status] ?? 'secondary'}>
                    {t(product.status)}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={() => setSampleFor(product.id)}>
                    {t('Order a sample')}
                  </Button>
                  {product.status === 'draft' && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        router.post(`/seller/products/${product.id}/status`, { status: 'active' })
                      }}
                    >
                      <Button variant="outline" size="sm" type="submit">
                        {t('Activate')}
                      </Button>
                    </form>
                  )}
                  {product.status === 'active' && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        router.post(`/seller/products/${product.id}/status`, {
                          status: 'archived',
                        })
                      }}
                    >
                      <Button variant="outline" size="sm" type="submit">
                        {t('Archive')}
                      </Button>
                    </form>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 text-sm text-ink-700">
                  <span>
                    {t('You earn a {v2}% margin on each order', {
                      v2: (product.marginBps / 100).toFixed(1),
                    })}
                  </span>
                  {product.status === 'active' && product.catalogProduct && (
                    <span className="font-medium text-fil-700">{t('Listed in the shop')}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Add Product')}</DialogTitle>
          </DialogHeader>
          <AddProductForm catalogProducts={catalogProducts} onClose={() => setShowAdd(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={sampleFor !== null} onOpenChange={() => setSampleFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Order a sample')}</DialogTitle>
          </DialogHeader>
          {sampleFor !== null && (
            <SampleOrderForm productId={sampleFor} onClose={() => setSampleFor(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

SellerProductsIndex.layout = 'dashboard'
SellerProductsIndex.dashboardProps = { navItems: sellerNav, title: 'Seller' }
