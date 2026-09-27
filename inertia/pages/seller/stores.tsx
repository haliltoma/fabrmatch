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
import { useT } from '~/lib/i18n'
import { cn } from '~/lib/utils'

type Connection = { id: number; provider: string; shopName: string; lastSyncedAt: string | null }
type Listing = {
  id: number
  title: string
  sku: string | null
  sellerProductId: number | null
  material: string | null
  color: string | null
  scalePercent: number | null
}
type ExternalOrder = {
  id: number
  name: string
  status: 'needs_mapping' | 'placed' | 'ignored' | 'failed'
  error: string | null
  lines: Array<{ title: string; sku: string | null; quantity: number }>
  order: { id: number; code: string; status: string; totalMinor: number; currency: string } | null
  fulfillmentStatus: 'none' | 'pending' | 'pushed' | 'failed'
  fulfillmentError: string | null
}
type Product = { id: number; title: string; materials: string[]; scales: number[] }

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

export default function SellerStores({
  testShops,
  connections,
  currentId,
  listings,
  orders,
  products,
}: {
  testShops: boolean
  webhookBase: string
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
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled variant="outline">
              {t('Connect Shopify')}
            </Button>
            <Button disabled variant="outline">
              {t('Connect Etsy')}
            </Button>
            {testShops && (
              <Button onClick={() => router.post('/seller/stores/test')}>
                {t('Add a test shop')}
              </Button>
            )}
          </div>
          <p className="text-sm text-ink-600">
            {t('Shopify and Etsy open as soon as our apps are approved by the platforms.')}
          </p>
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

      {current && (
        <>
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
SellerStores.dashboardProps = { navItems: sellerNav, title: 'Seller Panel' }
