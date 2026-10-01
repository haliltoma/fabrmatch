import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { sellerNav } from '~/lib/nav'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { OrderCode } from '~/components/order_code'
import { PageHeader } from '~/components/page_header'
import { StatusBadge } from '~/components/status_badge'
import { formatMoney } from '~/lib/format'
import { MoneyInput } from '~/components/money_input'
import { useT } from '~/lib/i18n'
import { cn } from '~/lib/utils'

type Connection = {
  id: number
  provider: string
  shopName: string
  shopUrl: string | null
  currency: string | null
  lastSyncedAt: string | null
}
type Listing = {
  id: number
  title: string
  sku: string | null
  sellerProductId: number | null
  material: string | null
  color: string | null
  scalePercent: number | null
  published: boolean
  priceMinor: number | null
  externalProductId: string
}
type ExternalOrder = {
  id: number
  name: string
  status: 'needs_mapping' | 'placed' | 'ignored' | 'failed' | 'cancelled'
  error: string | null
  lines: Array<{ title: string; sku: string | null; quantity: number }>
  order: { id: number; code: string; status: string; totalMinor: number; currency: string } | null
  fulfillmentStatus: 'none' | 'pending' | 'pushed' | 'failed'
  fulfillmentError: string | null
}
type Product = {
  id: number
  title: string
  materials: string[]
  scales: number[]
  prices: Array<{ material: string; costMinor: number; suggestedMinor: number }>
}

const selectClass =
  'h-10 w-full rounded-md border border-line bg-paper-raised px-3 text-sm text-ink-900 focus-visible:outline-2 focus-visible:outline-heat-500'

function MappingRow({ listing, products }: { listing: Listing; products: Product[] }) {
  const { t } = useT()
  const [productId, setProductId] = useState<number | null>(listing.sellerProductId)
  const product = products.find((p) => p.id === productId) ?? null
  const [material, setMaterial] = useState(listing.material ?? product?.materials[0] ?? '')
  const [color, setColor] = useState(listing.color ?? '')
  const [scale, setScale] = useState(listing.scalePercent ?? 100)
  const id = (name: string) => `map-${listing.id}-${name}`

  return (
    <form
      className="grid gap-3 border-t border-line pt-4 first:border-0 first:pt-0 md:grid-cols-[2fr_2fr_1fr_1fr_1fr_auto] md:items-end"
      onSubmit={(e) => {
        e.preventDefault()
        router.post(`/seller/stores/listings/${listing.id}`, {
          sellerProductId: productId,
          material: productId ? material : null,
          color: productId ? color || null : null,
          scalePercent: productId ? scale : null,
        })
      }}
    >
      <div>
        <p className="text-sm font-medium text-ink-900">{listing.title}</p>
        <p className="font-mono text-xs text-ink-600">{listing.sku ?? t('no SKU')}</p>
      </div>
      <div className="space-y-1">
        <Label htmlFor={id('product')}>{t('Your product')}</Label>
        <select
          id={id('product')}
          className={selectClass}
          value={productId ?? ''}
          onChange={(e) => {
            const next = e.target.value ? Number(e.target.value) : null
            setProductId(next)
            const chosen = products.find((p) => p.id === next)
            if (chosen) {
              setMaterial(chosen.materials[0] ?? '')
              setScale(chosen.scales.includes(100) ? 100 : chosen.scales[0])
            }
          }}
        >
          <option value="">{t('Not linked')}</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor={id('material')}>{t('Material')}</Label>
        <select
          id={id('material')}
          className={selectClass}
          disabled={!product}
          value={material}
          onChange={(e) => setMaterial(e.target.value)}
        >
          {(product?.materials ?? []).map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor={id('color')}>{t('Colour')}</Label>
        <Input
          id={id('color')}
          disabled={!product}
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={id('scale')}>{t('Size')}</Label>
        <select
          id={id('scale')}
          className={selectClass}
          disabled={!product}
          value={scale}
          onChange={(e) => setScale(Number(e.target.value))}
        >
          {(product?.scales ?? [100]).map((s) => (
            <option key={s} value={s}>
              {s}%
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" variant="outline">
        {t('Save')}
      </Button>
    </form>
  )
}

function ConnectForm({
  shopifyScopes,
  etsyAvailable,
}: {
  shopifyScopes: string[]
  etsyAvailable: boolean
}) {
  const { t } = useT()
  const [provider, setProvider] = useState<'shopify' | 'woocommerce' | 'etsy'>('shopify')
  const [form, setForm] = useState({ shopUrl: '', apiKey: '', apiSecret: '', accessToken: '' })
  const [legacy, setLegacy] = useState(false)
  const [busy, setBusy] = useState(false)
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm({ ...form, [key]: e.target.value })

  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label={t('Platform')} className="flex flex-wrap gap-2">
        {(
          [
            ['shopify', 'Shopify'],
            ['woocommerce', 'WooCommerce'],
            ['etsy', 'Etsy'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={provider === value}
            onClick={() => setProvider(value)}
            className={cn(
              'rounded-md border px-3 py-2 text-sm',
              provider === value
                ? 'border-heat-500 text-ink-900'
                : 'border-line text-ink-700 hover:border-ink-500'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {provider === 'etsy' ? (
        etsyAvailable ? (
          <div className="space-y-3">
            <p className="text-sm text-ink-700">
              {t(
                'You sign in on Etsy and allow Fabrmatch to list products and read orders. New paid orders are picked up every few minutes.'
              )}
            </p>
            <p className="text-sm text-ink-700">
              {t(
                'Your Etsy shop needs a shipping profile and a processing profile before we can publish.'
              )}
            </p>
            <Button asChild>
              <a href="/seller/stores/etsy/start">{t('Connect with Etsy')}</a>
            </Button>
          </div>
        ) : (
          <p className="rounded-md bg-paper-sunken px-4 py-3 text-sm text-ink-700">
            {t(
              'Etsy does not allow connecting with an API key alone: it opens with a “Connect with Etsy” button once Etsy approves our app.'
            )}
          </p>
        )
      ) : (
        <>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-700">
            {provider === 'shopify' ? (
              <>
                <li>
                  {t('Open dev.shopify.com (Dev Dashboard) and create an app for your shop.')}
                </li>
                <li>
                  {t('Give it these permissions:')}{' '}
                  <span className="font-mono text-xs">{shopifyScopes.join(', ')}</span>
                </li>
                <li>{t('Install the app on your shop.')}</li>
                <li>{t('Copy the Client ID and Client secret from the app settings here.')}</li>
              </>
            ) : (
              <>
                <li>{t('In WordPress go to WooCommerce → Settings → Advanced → REST API.')}</li>
                <li>{t('Add a key with Read/Write permission.')}</li>
                <li>{t('Copy the Consumer key and Consumer secret here.')}</li>
              </>
            )}
          </ol>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault()
              setBusy(true)
              router.post(
                '/seller/stores/connect',
                {
                  provider,
                  shopUrl: form.shopUrl,
                  apiKey: legacy ? undefined : form.apiKey,
                  apiSecret: form.apiSecret,
                  accessToken: legacy ? form.accessToken : undefined,
                },
                {
                  onFinish: () => {
                    setBusy(false)
                    setForm((f) => ({ ...f, apiSecret: '', accessToken: '' }))
                  },
                }
              )
            }}
          >
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="c-url">{t('Shop address')}</Label>
              <Input
                id="c-url"
                required
                placeholder={
                  provider === 'shopify' ? 'my-shop.myshopify.com' : 'https://www.my-shop.com'
                }
                value={form.shopUrl}
                onChange={set('shopUrl')}
              />
            </div>
            {provider === 'shopify' && legacy ? (
              <div className="space-y-1">
                <Label htmlFor="c-token">{t('Admin API access token')}</Label>
                <Input
                  id="c-token"
                  required
                  autoComplete="off"
                  value={form.accessToken}
                  onChange={set('accessToken')}
                />
              </div>
            ) : (
              <div className="space-y-1">
                <Label htmlFor="c-key">
                  {provider === 'shopify' ? t('Client ID') : t('Consumer key')}
                </Label>
                <Input
                  id="c-key"
                  required
                  autoComplete="off"
                  value={form.apiKey}
                  onChange={set('apiKey')}
                />
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="c-secret">
                {provider === 'shopify'
                  ? legacy
                    ? t('API secret key')
                    : t('Client secret')
                  : t('Consumer secret')}
              </Label>
              <Input
                id="c-secret"
                type="password"
                required
                autoComplete="off"
                value={form.apiSecret}
                onChange={set('apiSecret')}
              />
            </div>
            {provider === 'shopify' && (
              <label className="flex items-center gap-2 text-sm text-ink-700 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={legacy}
                  onChange={(e) => setLegacy(e.target.checked)}
                  className="accent-heat-600"
                />
                {t('I have an older custom app with an admin API token (created before 2026)')}
              </label>
            )}
            <p className="text-xs text-ink-600 sm:col-span-2">
              {t(
                'We check the keys with your shop before saving them, store them encrypted and use them only for your products and orders.'
              )}
            </p>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={busy}>
                {t('Connect shop')}
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  )
}

function PublishForm({
  connection,
  products,
  listings,
}: {
  connection: Connection
  products: Product[]
  listings: Listing[]
}) {
  const { t } = useT()
  const [productId, setProductId] = useState<number | null>(products[0]?.id ?? null)
  const product = products.find((p) => p.id === productId) ?? null
  const publishedPrice = (material: string) =>
    listings.find((l) => l.published && l.sellerProductId === productId && l.material === material)
      ?.priceMinor ?? null
  const [prices, setPrices] = useState<Record<string, number | null>>({})
  const [chosen, setChosen] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState(false)
  const [category, setCategory] = useState<{ id: number; path: string } | null>(null)
  const [categoryQuery, setCategoryQuery] = useState('')
  const [categoryResults, setCategoryResults] = useState<Array<{ id: number; path: string }>>([])
  const needsCategory = connection.provider === 'etsy'
  const alreadyPublished = listings.some((l) => l.published && l.sellerProductId === productId)
  const currency = connection.currency ?? 'TRY'

  if (products.length === 0) {
    return (
      <p className="text-sm text-ink-700">
        {t('Create a product first; then publish it to your shop from here.')}{' '}
        <Link href="/seller/products" className="text-heat-700 underline">
          {t('Products')}
        </Link>
      </p>
    )
  }

  const rows = product?.prices ?? []
  const priceOf = (material: string, suggested: number) =>
    prices[`${productId}:${material}`] ?? publishedPrice(material) ?? suggested
  const isChosen = (material: string) => chosen[`${productId}:${material}`] ?? true

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (!product) return
        setBusy(true)
        router.post(
          `/seller/stores/${connection.id}/publish`,
          {
            sellerProductId: product.id,
            ...(needsCategory && category ? { categoryId: String(category.id) } : {}),
            variants: rows
              .filter((r) => isChosen(r.material))
              .map((r) => ({
                material: r.material,
                priceMinor: priceOf(r.material, r.suggestedMinor),
              })),
          },
          { onFinish: () => setBusy(false) }
        )
      }}
    >
      <div className="space-y-1">
        <Label htmlFor="pub-product">{t('Product')}</Label>
        <select
          id="pub-product"
          className={selectClass}
          value={productId ?? ''}
          onChange={(e) => setProductId(Number(e.target.value))}
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </div>
      {needsCategory && !alreadyPublished && (
        <div className="space-y-1">
          <Label htmlFor="pub-category">{t('Etsy category')}</Label>
          <Input
            id="pub-category"
            placeholder={t('Search, e.g. vase')}
            value={category ? category.path : categoryQuery}
            onChange={async (e) => {
              setCategory(null)
              setCategoryQuery(e.target.value)
              if (e.target.value.trim().length < 2) return setCategoryResults([])
              const res = await fetch(
                `/seller/stores/etsy/categories?q=${encodeURIComponent(e.target.value.trim())}`,
                { headers: { accept: 'application/json' } }
              )
              if (res.ok) {
                const found = await res.json()
                setCategoryResults(found.results)
              }
            }}
          />
          {!category && categoryResults.length > 0 && (
            <ul className="max-h-56 overflow-y-auto rounded-md border border-line bg-paper-raised text-sm">
              {categoryResults.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-paper-sunken focus-visible:bg-paper-sunken"
                    onClick={() => {
                      setCategory(c)
                      setCategoryResults([])
                    }}
                  >
                    {c.path}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {currency !== 'TRY' && (
        <p className="rounded-md bg-amber-soft px-4 py-3 text-sm text-amber-ink">
          {t(
            'Your shop sells in {currency}. Enter shop prices in {currency}; what you pay us stays in TRY.',
            {
              currency,
            }
          )}
        </p>
      )}
      {rows.length === 0 ? (
        <p className="text-sm text-ink-600">{t('This product has no priced material yet.')}</p>
      ) : (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-ink-900">
            {t('Materials and shop prices')}
          </legend>
          {rows.map((r) => {
            const id = `pub-${productId}-${r.material}`
            return (
              <div key={id} className="grid items-end gap-3 sm:grid-cols-[auto_1fr_1fr]">
                <label className="flex items-center gap-2 pb-2 text-sm text-ink-900">
                  <input
                    type="checkbox"
                    className="accent-heat-600"
                    checked={isChosen(r.material)}
                    onChange={(e) =>
                      setChosen({ ...chosen, [`${productId}:${r.material}`]: e.target.checked })
                    }
                  />
                  <span className="font-mono">{r.material}</span>
                </label>
                <div className="space-y-1">
                  <Label htmlFor={id}>{t('Price in your shop')}</Label>
                  <MoneyInput
                    key={id}
                    id={id}
                    currency={currency}
                    valueMinor={priceOf(r.material, r.suggestedMinor)}
                    onChange={(minor) =>
                      setPrices({ ...prices, [`${productId}:${r.material}`]: minor })
                    }
                  />
                </div>
                <p className="pb-2 text-sm text-ink-600">
                  {t('You pay {cost} per piece incl. delivery in Türkiye', {
                    cost: formatMoney(r.costMinor, 'TRY'),
                  })}
                </p>
              </div>
            )
          })}
        </fieldset>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          disabled={
            busy ||
            !product ||
            !rows.some((r) => isChosen(r.material)) ||
            (needsCategory && !alreadyPublished && !category)
          }
        >
          {alreadyPublished ? t('Update in my shop') : t('Publish to my shop')}
        </Button>
        {alreadyPublished && product && (
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => {
              if (
                window.confirm(
                  t('Take this product off sale in your shop? It stays there as a draft.')
                )
              ) {
                router.post(`/seller/stores/${connection.id}/unpublish`, {
                  sellerProductId: product.id,
                })
              }
            }}
          >
            {t('Take off sale')}
          </Button>
        )}
      </div>
    </form>
  )
}

export default function SellerStores({
  testShops,
  shopifyScopes,
  etsyAvailable,
  connections,
  currentId,
  listings,
  orders,
  products,
}: {
  testShops: boolean
  shopifyScopes: string[]
  etsyAvailable: boolean
  callbackUrl: string | null
  currency: string | null
  connections: Connection[]
  currentId: number | null
  listings: Listing[]
  orders: ExternalOrder[]
  products: Product[]
}) {
  const { t } = useT()
  const current = connections.find((c) => c.id === currentId) ?? null
  const unmapped = listings.filter((l) => !l.sellerProductId).length

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t('Your shops')}
        description={t(
          'Orders from your own shop become Fabrmatch orders. You pay the production cost, we print and ship to your customer, and the tracking number goes back to your shop.'
        )}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t('Connected shops')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {connections.length > 0 && (
            <nav aria-label={t('Connected shops')} className="flex flex-wrap gap-2">
              {connections.map((c) => (
                <Link
                  key={c.id}
                  href={`/seller/stores?shop=${c.id}`}
                  aria-current={c.id === currentId ? 'page' : undefined}
                  className={cn(
                    'rounded-md border px-3 py-2 text-sm',
                    c.id === currentId
                      ? 'border-heat-500 text-ink-900'
                      : 'border-line text-ink-700 hover:border-ink-500'
                  )}
                >
                  {c.shopName}
                </Link>
              ))}
            </nav>
          )}
          {testShops && (
            <Button variant="outline" onClick={() => router.post('/seller/stores/test')}>
              {t('Add a test shop')}
            </Button>
          )}
          {current && (
            <div className="flex flex-wrap gap-2 border-t border-line pt-4">
              <Button
                variant="outline"
                onClick={() => router.post(`/seller/stores/${current.id}/sync`)}
              >
                {t('Refresh products')}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  if (window.confirm(t('Disconnect this shop? Its orders stop coming in.'))) {
                    router.post(`/seller/stores/${current.id}/disconnect`)
                  }
                }}
              >
                {t('Disconnect')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {connections.length === 0 ? t('Connect your shop') : t('Connect another shop')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ConnectForm shopifyScopes={shopifyScopes} etsyAvailable={etsyAvailable} />
        </CardContent>
      </Card>

      {current && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{t('Publish a product to {shop}', { shop: current.shopName })}</CardTitle>
            </CardHeader>
            <CardContent>
              <PublishForm connection={current} products={products} listings={listings} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {t('Link your shop’s products')}{' '}
                {unmapped > 0 && (
                  <span className="text-sm font-normal text-amber-ink">
                    {t('{count} not linked', { count: String(unmapped) })}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {products.length === 0 && (
                <p className="text-sm text-ink-700">
                  {t('Create a product first; then link each item of your shop to it.')}{' '}
                  <Link href="/seller/products" className="text-heat-700 underline">
                    {t('Products')}
                  </Link>
                </p>
              )}
              {listings.length === 0 ? (
                <p className="text-sm text-ink-600">{t('No products in this shop yet.')}</p>
              ) : (
                listings.map((l) => <MappingRow key={l.id} listing={l} products={products} />)
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('Orders from this shop')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {orders.length === 0 && (
                <p className="text-sm text-ink-600">
                  {t('No orders yet. New orders appear here within a minute.')}
                </p>
              )}
              {orders.map((o) => (
                <section
                  key={o.id}
                  className="space-y-2 border-t border-line pt-4 first:border-0 first:pt-0"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-mono text-sm font-medium text-ink-900">{o.name}</h3>
                    <StatusBadge status={o.order?.status ?? o.status} />
                  </div>
                  <ul className="text-sm text-ink-700">
                    {o.lines.map((l, i) => (
                      <li key={i}>
                        {l.quantity} × {l.title}
                      </li>
                    ))}
                  </ul>
                  {o.error && o.status !== 'placed' && (
                    <p className="text-sm text-amber-ink">{o.error}</p>
                  )}
                  {o.order && (
                    <p className="flex flex-wrap items-center gap-3 text-sm">
                      <Link href={`/orders/${o.order.id}`} className="text-heat-700 underline">
                        <OrderCode code={o.order.code} />
                      </Link>
                      <span className="tabular">
                        {formatMoney(o.order.totalMinor, o.order.currency)}
                      </span>
                      {['draft', 'awaiting_payment'].includes(o.order.status) && (
                        <Link
                          href={`/orders/${o.order.id}`}
                          className="font-medium text-heat-700 underline"
                        >
                          {t('Pay to start production')}
                        </Link>
                      )}
                    </p>
                  )}
                  {o.fulfillmentStatus === 'pushed' && (
                    <p className="text-sm text-success">{t('Tracking sent to your shop.')}</p>
                  )}
                  {o.fulfillmentStatus === 'failed' && (
                    <p className="flex flex-wrap items-center gap-2 text-sm text-danger">
                      {t('Could not send the tracking to your shop:')} {o.fulfillmentError}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.post(`/seller/stores/orders/${o.id}/retry`)}
                      >
                        {t('Try again')}
                      </Button>
                    </p>
                  )}
                </section>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

SellerStores.layout = 'dashboard'
SellerStores.dashboardProps = { navItems: sellerNav, title: 'Seller' }
