import { useEffect, useState } from 'react'
import { Copy, Download, ImageIcon, Package, Pencil, Store, Upload } from 'lucide-react'
import { router, usePage } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { toast } from 'sonner'
import { sellerNav } from '~/lib/nav'
import { formatMoney } from '~/lib/format'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Badge } from '~/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { PageHeader } from '~/components/page_header'
import { EmptyState } from '~/components/empty_state'
import { FieldError, FormErrors } from '~/components/field_error'
import { ProductThumb, type ShopImage } from '~/components/product_image'
import { useT } from '~/lib/i18n'

type ProductData = {
  id: string
  title: string
  description: string | null
  currency: string
  marginBps: number
  minMakerTier: number
  status: string
  shopListed: boolean
  catalogProduct: {
    id: string
    title: string
    ownDesign: boolean
    materials: string[]
    scales: number[]
    tags: string[]
    categoryId: string | null
  } | null
  images: Array<Pick<ShopImage, 'id' | 'url' | 'kind' | 'angle'>>
  shops: Array<{ connectionId: string; shopName: string; provider: string }>
}

type CatalogOption = { id: string; title: string; allowedMaterials: string[] }
type DesignFile = {
  id: string
  name: string
  sizeMm: Array<number | null>
  createdAt: string | null
}
type MaterialOption = { code: string; name: string }
type CategoryOption = { id: string; name: string }

type MarginOption = {
  material: string
  buyerPriceMinor: number
  sellerEarnsMinor: number
  costMinor: number
}

/** Sizes a seller can offer besides the original (percent of the model). */
const SIZE_CHOICES = [50, 75, 125, 150, 200]

const selectClass =
  'flex h-10 w-full rounded-md border border-line bg-paper-raised px-3 py-2 text-base sm:text-sm'
const textareaClass =
  'flex min-h-20 w-full rounded-md border border-line bg-paper-raised px-3 py-2 text-base sm:text-sm'

const toBps = (percent: string) =>
  percent === '' ? undefined : Math.round(Number(percent.replace(',', '.')) * 100)

/** Live "what does this margin mean in money" for a design (platform or the seller's own). */
function MarginPreview({
  catalogProductId,
  marginPercent,
}: {
  catalogProductId: string | null
  marginPercent: string
}) {
  const { t } = useT()

  const [options, setOptions] = useState<MarginOption[]>([])
  const bps = toBps(marginPercent) ?? null
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

function CheckboxRow({
  name,
  options,
  value,
  onChange,
  legend,
}: {
  name: string
  options: Array<{ value: string; label: string }>
  value: string[]
  onChange: (v: string[]) => void
  legend: string
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-ink-900">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = value.includes(o.value)
          return (
            <label
              key={o.value}
              className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm ${on ? 'border-ink-900 bg-paper-raised font-medium text-ink-900' : 'border-line text-ink-700'}`}
            >
              <input
                type="checkbox"
                name={name}
                className="h-4 w-4 accent-heat-600"
                checked={on}
                onChange={(e) =>
                  onChange(
                    e.target.checked ? [...value, o.value] : value.filter((x) => x !== o.value)
                  )
                }
              />
              {o.label}
            </label>
          )
        })}
      </div>
      <FieldError name={name} />
    </fieldset>
  )
}

function MarginAndTier({
  margin,
  setMargin,
  tier,
  setTier,
}: {
  margin: string
  setMargin: (v: string) => void
  tier: string
  setTier: (v: string) => void
}) {
  const { t } = useT()
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <Label htmlFor="margin">{t('Your margin (%)')}</Label>
        <Input
          id="margin"
          inputMode="decimal"
          placeholder={t('Leave empty for your default')}
          value={margin}
          onChange={(e) => setMargin(e.target.value)}
        />
        <p className="mt-1 text-xs text-ink-600">
          {t('Added on top of production cost and fees. Buyers see the final price.')}
        </p>
        <FieldError name="marginBps" />
      </div>
      <div>
        <Label htmlFor="tier">{t('Maker level')}</Label>
        <select
          id="tier"
          className={selectClass}
          value={tier}
          onChange={(e) => setTier(e.target.value)}
        >
          <option value="0">{t('Any approved maker')}</option>
          <option value="1">{t('Verified makers and above')}</option>
          <option value="2">{t('Trusted makers and above')}</option>
          <option value="3">{t('Partners only')}</option>
        </select>
        <p className="mt-1 text-xs text-ink-600">
          {t('Higher levels mean fewer makers can take your orders. You never see who prints.')}
        </p>
      </div>
    </div>
  )
}

function ShopListedToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const { t } = useT()
  return (
    <label className="flex items-start gap-3 text-sm text-ink-700">
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 shrink-0 accent-heat-600"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="font-medium text-ink-900">{t('Also sell it in the Fabrmatch shop')}</span>
        <br />
        {t('Off: it sells only through your own shops, your site and the API.')}
      </span>
    </label>
  )
}

/** W1: a product from one of the seller's own uploaded models. */
function DesignForm({
  files,
  materials,
  categories,
  onClose,
}: {
  files: DesignFile[]
  materials: MaterialOption[]
  categories: CategoryOption[]
  onClose: () => void
}) {
  const { t } = useT()
  const [data, setData] = useState({
    modelFileId: files[0]?.id ?? '',
    title: '',
    description: '',
    materials: materials.some((m) => m.code === 'PLA') ? ['PLA'] : [],
    scales: [] as string[],
    categoryId: '',
    tags: '',
    margin: '',
    tier: '0',
    shopListed: true,
    rightsConfirmed: false,
  })
  const [processing, setProcessing] = useState(false)
  const set = <K extends keyof typeof data>(key: K, value: (typeof data)[K]) =>
    setData((d) => ({ ...d, [key]: value }))

  if (files.length === 0) {
    return (
      <div className="space-y-3 text-sm text-ink-700">
        <p>
          {t(
            'Upload your 3D model first. Once its check has finished it can become a product here.'
          )}
        </p>
        <Button asChild>
          <Link href="/files">
            <Upload className="mr-1.5 h-4 w-4" />
            {t('Upload a model')}
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        router.post(
          '/seller/products/design',
          {
            modelFileId: data.modelFileId,
            title: data.title,
            description: data.description || undefined,
            materials: data.materials,
            scales: data.scales.map(Number),
            categoryId: data.categoryId || undefined,
            tags: data.tags
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
            marginBps: toBps(data.margin),
            minMakerTier: Number(data.tier),
            shopListed: data.shopListed,
            rightsConfirmed: data.rightsConfirmed,
          },
          {
            onStart: () => setProcessing(true),
            onFinish: () => setProcessing(false),
            onSuccess: () => onClose(),
          }
        )
      }}
    >
      <FormErrors />
      <div>
        <Label htmlFor="design-file">{t('Your model')}</Label>
        <select
          id="design-file"
          className={selectClass}
          value={data.modelFileId}
          onChange={(e) => set('modelFileId', e.target.value)}
        >
          {files.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
              {f.sizeMm.every((n) => n !== null)
                ? ` · ${f.sizeMm.map((n) => Math.round(n!)).join(' × ')} mm`
                : ''}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-ink-600">
          {t('Only checked, printable files of yours are listed. The file itself stays private.')}
        </p>
      </div>
      <div>
        <Label htmlFor="design-title">{t('Title')}</Label>
        <Input
          id="design-title"
          value={data.title}
          onChange={(e) => set('title', e.target.value)}
          required
          minLength={2}
        />
        <FieldError name="title" />
      </div>
      <div>
        <Label htmlFor="design-description">{t('Description')}</Label>
        <textarea
          id="design-description"
          className={textareaClass}
          value={data.description}
          onChange={(e) => set('description', e.target.value)}
          maxLength={2000}
        />
      </div>
      <CheckboxRow
        name="materials"
        legend={t('Materials buyers can choose')}
        options={materials.map((m) => ({ value: m.code, label: m.code }))}
        value={data.materials}
        onChange={(v) => set('materials', v)}
      />
      <CheckboxRow
        name="scales"
        legend={t('Extra sizes (the original size is always offered)')}
        options={SIZE_CHOICES.map((s) => ({ value: String(s), label: `${s}%` }))}
        value={data.scales}
        onChange={(v) => set('scales', v)}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="design-category">{t('Category')}</Label>
          <select
            id="design-category"
            className={selectClass}
            value={data.categoryId}
            onChange={(e) => set('categoryId', e.target.value)}
          >
            <option value="">{t('None')}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {t(c.name)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="design-tags">{t('Tags (comma separated)')}</Label>
          <Input
            id="design-tags"
            placeholder={t('lamp, home, gift')}
            value={data.tags}
            onChange={(e) => set('tags', e.target.value)}
          />
        </div>
      </div>
      <MarginAndTier
        margin={data.margin}
        setMargin={(v) => set('margin', v)}
        tier={data.tier}
        setTier={(v) => set('tier', v)}
      />
      <ShopListedToggle value={data.shopListed} onChange={(v) => set('shopListed', v)} />
      <label className="flex items-start gap-3 text-sm text-ink-700">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 shrink-0 accent-heat-600"
          checked={data.rightsConfirmed}
          onChange={(e) => set('rightsConfirmed', e.target.checked)}
          required
        />
        <span>
          {t(
            'This is my own design, or I have a licence to sell prints of it. Reported copies are taken down.'
          )}
        </span>
      </label>
      <FieldError name="rightsConfirmed" />
      <Button type="submit" disabled={processing || data.materials.length === 0}>
        {t('Create product')}
      </Button>
    </form>
  )
}

function CatalogForm({
  catalogProducts,
  onClose,
}: {
  catalogProducts: CatalogOption[]
  onClose: () => void
}) {
  const { t } = useT()
  const [data, setData] = useState({
    catalogProductId: catalogProducts[0]?.id ?? '',
    title: catalogProducts[0]?.title ?? '',
    description: '',
    margin: '',
    tier: '0',
  })
  const set = <K extends keyof typeof data>(key: K, value: (typeof data)[K]) =>
    setData((d) => ({ ...d, [key]: value }))

  if (catalogProducts.length === 0) {
    return <p className="text-sm text-ink-700">{t('The catalogue is empty for now.')}</p>
  }
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        router.post(
          '/seller/products',
          {
            catalogProductId: data.catalogProductId,
            title: data.title,
            description: data.description || undefined,
            marginBps: toBps(data.margin),
            minMakerTier: Number(data.tier),
          },
          { onSuccess: () => onClose() }
        )
      }}
    >
      <FormErrors />
      <div>
        <Label htmlFor="catalog">{t('Design from the catalogue')}</Label>
        <select
          id="catalog"
          className={selectClass}
          value={data.catalogProductId}
          onChange={(e) => {
            const cat = catalogProducts.find((c) => c.id === e.target.value)
            setData((d) => ({ ...d, catalogProductId: e.target.value, title: cat?.title ?? '' }))
          }}
        >
          {catalogProducts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title} · {c.allowedMaterials.join(', ')}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="catalog-title">{t('Title')}</Label>
        <Input
          id="catalog-title"
          value={data.title}
          onChange={(e) => set('title', e.target.value)}
        />
        <FieldError name="title" />
      </div>
      <div>
        <Label htmlFor="catalog-description">{t('Description')}</Label>
        <textarea
          id="catalog-description"
          className={textareaClass}
          placeholder={t('Leave empty to use the catalogue text')}
          value={data.description}
          onChange={(e) => set('description', e.target.value)}
        />
      </div>
      <MarginAndTier
        margin={data.margin}
        setMargin={(v) => set('margin', v)}
        tier={data.tier}
        setTier={(v) => set('tier', v)}
      />
      <MarginPreview catalogProductId={data.catalogProductId || null} marginPercent={data.margin} />
      <Button type="submit">{t('Create product')}</Button>
    </form>
  )
}

function AddProduct({
  catalogProducts,
  files,
  materials,
  categories,
  onClose,
}: {
  catalogProducts: CatalogOption[]
  files: DesignFile[]
  materials: MaterialOption[]
  categories: CategoryOption[]
  onClose: () => void
}) {
  const { t } = useT()
  const [source, setSource] = useState<'design' | 'catalog'>('design')
  return (
    <div className="space-y-5">
      <div
        role="radiogroup"
        aria-label={t('Where the design comes from')}
        className="grid grid-cols-2 gap-2"
      >
        {(
          [
            ['design', t('My own design'), t('A model you uploaded')],
            ['catalog', t('Fabrmatch catalogue'), t('A ready-made design')],
          ] as const
        ).map(([value, label, hint]) => (
          <label
            key={value}
            className={`cursor-pointer rounded-md border-2 p-3 text-sm ${source === value ? 'border-ink-900 bg-paper-raised' : 'border-line'}`}
          >
            <input
              type="radio"
              name="source"
              className="sr-only"
              checked={source === value}
              onChange={() => setSource(value)}
            />
            <span className="block font-medium text-ink-900">{label}</span>
            <span className="text-xs text-ink-600">{hint}</span>
          </label>
        ))}
      </div>
      {source === 'design' ? (
        <DesignForm files={files} materials={materials} categories={categories} onClose={onClose} />
      ) : (
        <CatalogForm catalogProducts={catalogProducts} onClose={onClose} />
      )}
    </div>
  )
}

function EditForm({
  product,
  materials,
  onClose,
}: {
  product: ProductData
  materials: MaterialOption[]
  onClose: () => void
}) {
  const { t } = useT()
  const own = product.catalogProduct?.ownDesign === true
  const [data, setData] = useState({
    title: product.title,
    description: product.description ?? '',
    margin: String(product.marginBps / 100),
    tier: String(product.minMakerTier),
    shopListed: product.shopListed,
    materials: product.catalogProduct?.materials ?? [],
    scales: (product.catalogProduct?.scales ?? []).filter((s) => s !== 100).map(String),
    tags: (product.catalogProduct?.tags ?? []).join(', '),
  })
  const set = <K extends keyof typeof data>(key: K, value: (typeof data)[K]) =>
    setData((d) => ({ ...d, [key]: value }))

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        router.put(
          `/seller/products/${product.id}`,
          {
            title: data.title,
            description: data.description || null,
            marginBps: toBps(data.margin),
            minMakerTier: Number(data.tier),
            shopListed: data.shopListed,
            ...(own
              ? {
                  materials: data.materials,
                  scales: data.scales.map(Number),
                  tags: data.tags
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                }
              : {}),
          },
          { onSuccess: () => onClose() }
        )
      }}
    >
      <FormErrors />
      <div>
        <Label htmlFor="edit-title">{t('Title')}</Label>
        <Input id="edit-title" value={data.title} onChange={(e) => set('title', e.target.value)} />
      </div>
      <div>
        <Label htmlFor="edit-description">{t('Description')}</Label>
        <textarea
          id="edit-description"
          className={textareaClass}
          value={data.description}
          onChange={(e) => set('description', e.target.value)}
        />
      </div>
      {own && (
        <>
          <CheckboxRow
            name="materials"
            legend={t('Materials buyers can choose')}
            options={materials.map((m) => ({ value: m.code, label: m.code }))}
            value={data.materials}
            onChange={(v) => set('materials', v)}
          />
          <CheckboxRow
            name="scales"
            legend={t('Extra sizes (the original size is always offered)')}
            options={SIZE_CHOICES.map((s) => ({ value: String(s), label: `${s}%` }))}
            value={data.scales}
            onChange={(v) => set('scales', v)}
          />
          <div>
            <Label htmlFor="edit-tags">{t('Tags (comma separated)')}</Label>
            <Input id="edit-tags" value={data.tags} onChange={(e) => set('tags', e.target.value)} />
          </div>
        </>
      )}
      <MarginAndTier
        margin={data.margin}
        setMargin={(v) => set('margin', v)}
        tier={data.tier}
        setTier={(v) => set('tier', v)}
      />
      <MarginPreview
        catalogProductId={product.catalogProduct?.id ?? null}
        marginPercent={data.margin}
      />
      <ShopListedToggle value={data.shopListed} onChange={(v) => set('shopListed', v)} />
      <p className="text-xs text-ink-600">
        {t('Changes reach your own shops when you publish the product there again.')}
      </p>
      <Button type="submit">{t('Save changes')}</Button>
    </form>
  )
}

/** W2: the product's pictures, to download or link from the seller's own site. */
function Pictures({ product }: { product: ProductData }) {
  const { t } = useT()
  const origin = typeof window === 'undefined' ? '' : window.location.origin
  if (product.images.length === 0) {
    return (
      <p className="text-sm text-ink-700">
        {t('Pictures are made from the model a minute after its check. Look again shortly.')}
      </p>
    )
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-700">
        {t(
          'Renders of your model on a transparent background. Use them on your own site: download them, or link the address (it stays the same).'
        )}
      </p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {product.images.map((image, i) => (
          <li key={image.id} className="overflow-hidden rounded-md border border-line">
            <div className="layer-lines aspect-square bg-paper-sunken">
              <img
                src={image.url}
                alt={t('{title}, picture {n}', { title: product.title, n: i + 1 })}
                loading="lazy"
                className="h-full w-full object-contain p-1"
              />
            </div>
            <div className="flex">
              <a
                href={image.url}
                download
                className="flex min-h-10 flex-1 items-center justify-center text-ink-700 hover:bg-paper-sunken"
                aria-label={t('Download picture {n}', { n: i + 1 })}
              >
                <Download className="h-4 w-4" strokeWidth={1.75} />
              </a>
              <button
                type="button"
                className="flex min-h-10 flex-1 items-center justify-center border-l border-line text-ink-700 hover:bg-paper-sunken"
                aria-label={t('Copy the address of picture {n}', { n: i + 1 })}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(`${origin}${image.url}`)
                    toast.success(t('Address copied'))
                  } catch {
                    toast.error(t('Could not copy; open the picture and copy its address'))
                  }
                }}
              >
                <Copy className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
          </li>
        ))}
      </ul>
      <Button asChild variant="outline">
        <a href={`/seller/products/${product.id}/images.zip`}>
          <Download className="mr-1.5 h-4 w-4" />
          {t('Download all ({n})', { n: product.images.length })}
        </a>
      </Button>
    </div>
  )
}

function SampleOrderForm({ product, onClose }: { product: ProductData; onClose: () => void }) {
  const { t } = useT()

  const [a, setA] = useState({
    fullName: '',
    line1: '',
    city: '',
    postalCode: '',
    country: 'TR',
    phone: '',
  })
  const choices = product.catalogProduct?.materials ?? ['PLA']
  const [material, setMaterial] = useState(choices[0] ?? 'PLA')
  const set = (k: keyof typeof a) => (v: string) => setA((x) => ({ ...x, [k]: v }))
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        router.post(
          `/seller/products/${product.id}/sample`,
          { material, shippingAddress: { ...a, phone: a.phone || undefined } },
          { onSuccess: () => onClose() }
        )
      }}
    >
      <p className="text-sm text-ink-700">
        {t('One piece at production cost, no margin. Check the print before you sell it.')}
      </p>
      <FormErrors />
      <div>
        <Label htmlFor="sm-mat">{t('Material')}</Label>
        <select
          id="sm-mat"
          className={selectClass}
          value={material}
          onChange={(e) => setMaterial(e.target.value)}
        >
          {choices.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
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
          <Label htmlFor={`sm-${key}`}>{t(label)}</Label>
          <Input id={`sm-${key}`} value={a[key]} onChange={(e) => set(key)(e.target.value)} />
        </div>
      ))}
      <Button type="submit">{t('Order sample')}</Button>
    </form>
  )
}

function ProductCard({
  product,
  shopsEnabled,
  onEdit,
  onPictures,
  onSample,
}: {
  product: ProductData
  shopsEnabled: boolean
  onEdit: () => void
  onPictures: () => void
  onSample: () => void
}) {
  const { t } = useT()
  const cover = product.images[0] ?? null
  const setStatus = (status: string) =>
    router.post(`/seller/products/${product.id}/status`, { status }, { preserveScroll: true })

  return (
    <Card className="flex flex-col overflow-hidden sm:flex-row">
      <button
        type="button"
        onClick={onPictures}
        className="shrink-0 border-b border-line sm:w-44 sm:border-b-0 sm:border-r"
        aria-label={t('Pictures of {title}', { title: product.title })}
      >
        <ProductThumb
          image={cover ? { ...cover, width: null, height: null } : null}
          title={product.title}
          bboxMm={null}
          className="h-40 sm:h-full sm:min-h-40"
        />
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-semibold text-ink-900">{product.title}</h2>
            <p className="text-xs text-ink-600">
              {product.catalogProduct?.ownDesign
                ? t('Your design')
                : t('From the catalogue: {title}', {
                    title: product.catalogProduct?.title ?? '—',
                  })}
              {product.catalogProduct &&
                ` · ${product.catalogProduct.materials.join(', ')}` +
                  (product.catalogProduct.scales.length > 1
                    ? ` · ${product.catalogProduct.scales.map((s) => `${s}%`).join(' ')}`
                    : '')}
            </p>
          </div>
          <Badge
            className="shrink-0"
            variant={
              product.status === 'active'
                ? 'success'
                : product.status === 'archived'
                  ? 'warning'
                  : 'secondary'
            }
          >
            {t(product.status)}
          </Badge>
        </div>

        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-700">
          <li>{t('{v2}% margin on each order', { v2: (product.marginBps / 100).toFixed(1) })}</li>
          <li>
            {product.status !== 'active'
              ? t('Not on sale yet')
              : product.shopListed
                ? t('In the Fabrmatch shop')
                : t('Only in your own shops')}
          </li>
        </ul>

        {product.shops.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-700">
            <Store className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            <span>{t('On sale in:')}</span>
            {product.shops.map((s) => (
              <span
                key={s.connectionId}
                className="rounded border border-line bg-paper-raised px-1.5 py-0.5 font-medium"
              >
                {s.shopName}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            {t('Edit')}
          </Button>
          <Button variant="outline" size="sm" onClick={onPictures}>
            <ImageIcon className="mr-1.5 h-3.5 w-3.5" />
            {t('Pictures')}
          </Button>
          {shopsEnabled && product.status !== 'archived' && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/seller/stores?product=${product.id}`}>
                <Store className="mr-1.5 h-3.5 w-3.5" />
                {t('Publish to my shop')}
              </Link>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onSample}>
            {t('Order a sample')}
          </Button>
          {product.status === 'draft' && (
            <Button size="sm" onClick={() => setStatus('active')}>
              {t('Put on sale')}
            </Button>
          )}
          {product.status === 'active' && (
            <Button variant="ghost" size="sm" onClick={() => setStatus('archived')}>
              {t('Archive')}
            </Button>
          )}
          {product.status === 'archived' && (
            <Button variant="outline" size="sm" onClick={() => setStatus('draft')}>
              {t('Restore as draft')}
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

export default function SellerProductsIndex({
  products,
  catalogProducts,
  designFiles,
  materials,
  categories,
}: {
  products: ProductData[]
  catalogProducts: CatalogOption[]
  designFiles: DesignFile[]
  materials: MaterialOption[]
  categories: CategoryOption[]
}) {
  const { t } = useT()
  const { externalStoresEnabled } = usePage<{ externalStoresEnabled?: boolean }>().props

  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<ProductData | null>(null)
  const [pictures, setPictures] = useState<ProductData | null>(null)
  const [sampleFor, setSampleFor] = useState<ProductData | null>(null)

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('My products')}
        description={t(
          'Turn your own models or catalogue designs into products. Sell them in the Fabrmatch shop, your own shops and your site; we print and ship every order.'
        )}
        action={<Button onClick={() => setShowAdd(true)}>{t('Add product')}</Button>}
      />

      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title={t('Nothing listed yet')}
          description={t(
            'Upload your own model or pick a catalogue design, set your margin, and sell it wherever you sell.'
          )}
          action={<Button onClick={() => setShowAdd(true)}>{t('Add your first product')}</Button>}
        />
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-2">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              shopsEnabled={externalStoresEnabled === true}
              onEdit={() => setEditing(product)}
              onPictures={() => setPictures(product)}
              onSample={() => setSampleFor(product)}
            />
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t('Add product')}</DialogTitle>
          </DialogHeader>
          <AddProduct
            catalogProducts={catalogProducts}
            files={designFiles}
            materials={materials}
            categories={categories}
            onClose={() => setShowAdd(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editing !== null} onOpenChange={() => setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t('Edit {title}', { title: editing?.title ?? '' })}</DialogTitle>
          </DialogHeader>
          {editing && (
            <EditForm product={editing} materials={materials} onClose={() => setEditing(null)} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={pictures !== null} onOpenChange={() => setPictures(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('Pictures of {title}', { title: pictures?.title ?? '' })}</DialogTitle>
          </DialogHeader>
          {pictures && <Pictures product={pictures} />}
        </DialogContent>
      </Dialog>

      <Dialog open={sampleFor !== null} onOpenChange={() => setSampleFor(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('Order a sample')}</DialogTitle>
          </DialogHeader>
          {sampleFor && <SampleOrderForm product={sampleFor} onClose={() => setSampleFor(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}

SellerProductsIndex.layout = 'dashboard'
SellerProductsIndex.dashboardProps = { navItems: sellerNav, title: 'Seller' }
