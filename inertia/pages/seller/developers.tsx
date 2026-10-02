import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { PageHeader } from '~/components/page_header'
import { StatusBadge } from '~/components/status_badge'
import { formatDateTime } from '~/lib/format'
import { useT } from '~/lib/i18n'
import { sellerNav } from '~/lib/nav'

type Key = {
  id: string
  name: string
  prefix: string
  scope: 'read' | 'read_write'
  lastUsedAt: string | null
  revoked: boolean
  createdAt: string
}
type Endpoint = {
  id: string
  url: string
  isActive: boolean
  disabledReason: string | null
  consecutiveFailures: number
}
type Delivery = {
  id: string
  endpointId: string
  eventType: string
  status: string
  attempts: number
  lastStatusCode: number | null
  lastError: string | null
  createdAt: string
}
type Props = {
  keys: Key[]
  endpoints: Endpoint[]
  deliveries: Delivery[]
  newApiKey: string | null
  newWebhookSecret: { endpointId: string; secret: string } | null
}

function Secret({ title, note, value }: { title: string; note: string; value: string }) {
  return (
    <div className="space-y-2 rounded-lg border border-heat-500 bg-heat-50 p-4" role="status">
      <p className="font-medium text-ink-900">{title}</p>
      <p className="text-sm text-ink-700">{note}</p>
      <p className="tabular break-all rounded-md bg-paper px-3 py-2 font-mono text-sm text-ink-900 select-all">
        {value}
      </p>
    </div>
  )
}

function KeysCard({ keys }: { keys: Key[] }) {
  const { t } = useT()
  const [name, setName] = useState('')
  const [scope, setScope] = useState<Key['scope']>('read')
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('API keys')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-ink-700">
          {t(
            'Connect your own website or systems: read your products, pictures and orders, and (with an ordering key) place orders we print and ship.'
          )}{' '}
          <a href="/api/v1/openapi.json" className="font-medium text-heat-700 underline">
            {t('API reference (OpenAPI)')}
          </a>
        </p>
        {keys.length === 0 ? (
          <p className="text-ink-700">{t('No API keys yet. Create one to get started.')}</p>
        ) : (
          <ul className="divide-y divide-line">
            {keys.map((k) => (
              <li key={k.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium text-ink-900">
                    {k.name}{' '}
                    <Badge variant={k.scope === 'read_write' ? 'accent' : 'outline'}>
                      {k.scope === 'read_write' ? t('Reads and orders') : t('Read only')}
                    </Badge>{' '}
                    {k.revoked && <Badge variant="secondary">{t('Revoked')}</Badge>}
                  </p>
                  <p className="tabular font-mono text-xs text-ink-600">{k.prefix}…</p>
                  <p className="text-xs text-ink-600">
                    {k.lastUsedAt
                      ? t('Last used {when}', { when: formatDateTime(k.lastUsedAt) })
                      : t('Never used')}
                  </p>
                </div>
                {!k.revoked && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (window.confirm(t('Revoke this key? Anything using it stops working.'))) {
                        router.post(`/seller/developers/keys/${k.id}/revoke`)
                      }
                    }}
                  >
                    {t('Revoke')}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        <form
          className="flex flex-wrap items-end gap-3 border-t border-line pt-4"
          onSubmit={(e) => {
            e.preventDefault()
            router.post(
              '/seller/developers/keys',
              { name, scope },
              { onSuccess: () => setName('') }
            )
          }}
        >
          <div className="min-w-56 flex-1 space-y-1">
            <Label htmlFor="key-name">{t('Key name')}</Label>
            <Input
              id="key-name"
              value={name}
              placeholder={t('e.g. Warehouse system')}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="key-scope">{t('What it may do')}</Label>
            <select
              id="key-scope"
              className="flex h-10 rounded-md border border-line bg-paper-raised px-3 text-sm"
              value={scope}
              onChange={(e) => setScope(e.target.value as Key['scope'])}
            >
              <option value="read">{t('Read only')}</option>
              <option value="read_write">{t('Read and place orders')}</option>
            </select>
          </div>
          <Button type="submit" disabled={name.trim().length < 2}>
            {t('Create key')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function WebhooksCard({ endpoints }: { endpoints: Endpoint[] }) {
  const { t } = useT()
  const [url, setUrl] = useState('')
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Webhooks')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-ink-700">
          {t(
            'We send a signed POST to your URL when an order from your shop or site is placed, changes status, ships or is cancelled, and when one of your sales changes.'
          )}
        </p>
        {endpoints.length === 0 ? (
          <p className="text-ink-700">{t('No webhook endpoints yet.')}</p>
        ) : (
          <ul className="divide-y divide-line">
            {endpoints.map((e) => (
              <li key={e.id} className="space-y-2 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="tabular break-all font-mono text-sm text-ink-900">{e.url}</p>
                  <Badge variant={e.isActive ? 'success' : 'secondary'}>
                    {e.isActive ? t('On') : t('Off')}
                  </Badge>
                </div>
                {e.disabledReason && <p className="text-xs text-ink-600">{e.disabledReason}</p>}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!e.isActive}
                    onClick={() => router.post(`/seller/developers/webhooks/${e.id}/test`)}
                  >
                    {t('Send test event')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      router.post(`/seller/developers/webhooks/${e.id}/toggle`, {
                        active: !e.isActive,
                      })
                    }
                  >
                    {e.isActive ? t('Turn off') : t('Turn on')}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (window.confirm(t('Delete this webhook?'))) {
                        router.delete(`/seller/developers/webhooks/${e.id}`)
                      }
                    }}
                  >
                    {t('Delete')}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <form
          className="flex flex-wrap items-end gap-3 border-t border-line pt-4"
          onSubmit={(e) => {
            e.preventDefault()
            router.post('/seller/developers/webhooks', { url }, { onSuccess: () => setUrl('') })
          }}
        >
          <div className="min-w-56 flex-1 space-y-1">
            <Label htmlFor="webhook-url">{t('Endpoint URL')}</Label>
            <Input
              id="webhook-url"
              type="url"
              value={url}
              placeholder="https://example.com/fabrmatch/webhooks"
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={url.trim() === ''}>
            {t('Add webhook')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function DeliveriesCard({ deliveries }: { deliveries: Delivery[] }) {
  const { t } = useT()
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Recent deliveries')}</CardTitle>
      </CardHeader>
      <CardContent>
        {deliveries.length === 0 ? (
          <p className="text-ink-700">{t('Nothing has been sent yet.')}</p>
        ) : (
          <ul className="divide-y divide-line">
            {deliveries.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                <div>
                  <p className="tabular font-mono text-sm text-ink-900">{d.eventType}</p>
                  <p className="text-xs text-ink-600">
                    {formatDateTime(d.createdAt)} · {t('attempts')}: {d.attempts}
                    {d.lastError ? ` · ${d.lastError}` : ''}
                  </p>
                </div>
                <StatusBadge status={d.status} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

const READ_ENDPOINTS = [
  ['GET /api/v1/products', 'your products: variants, what each costs you, colours, pictures'],
  ['GET /api/v1/products/:id', 'one product'],
  ['GET /api/v1/catalog/options', 'materials and colours'],
  ['GET /api/v1/orders?source=own', 'orders from your shops and website'],
  ['GET /api/v1/orders', 'sales in the Fabrmatch shop'],
  ['GET /api/v1/orders/:id', 'one order, with its tracking once shipped'],
] as const

const WRITE_ENDPOINTS = [
  ['POST /api/v1/quotes', 'what lines would cost you'],
  ['POST /api/v1/orders', 'place an order we print and ship to your customer'],
  ['POST /api/v1/orders/:id/cancel', 'cancel before a maker starts'],
] as const

const ORDER_EXAMPLE = `curl -X POST https://YOUR-DOMAIN/api/v1/orders \\
  -H "Authorization: Bearer fmk_…" -H "Content-Type: application/json" \\
  -d '{
    "externalId": "web-1042",
    "lines": [{ "productId": "…", "material": "PLA",
                "color": "Black", "scalePercent": 100, "quantity": 1 }],
    "shippingAddress": { "fullName": "Ada Yılmaz", "line1": "Atatürk Cd. 1",
      "city": "İstanbul", "postalCode": "34000", "country": "TR",
      "phone": "+905551112233" }
  }'`

function DocsCard() {
  const { t } = useT()
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('How to use it')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-ink-700">
        <p>{t('Send the key as a bearer token:')}</p>
        {/* scrolls sideways on phones: focusable so keyboard users can scroll it too */}
        <pre
          tabIndex={0}
          aria-label={t('Example requests')}
          className="overflow-x-auto rounded-md bg-paper-sunken p-3 font-mono text-xs text-ink-900 focus-visible:outline-2 focus-visible:outline-heat-500"
        >
          {`curl -H "Authorization: Bearer fmk_…" \\\n  https://YOUR-DOMAIN/api/v1/orders`}
        </pre>
        <p className="font-medium text-ink-900">{t('Read (any key)')}</p>
        <ul className="list-disc space-y-1 pl-5">
          {READ_ENDPOINTS.map(([path, what]) => (
            <li key={path}>
              <code className="font-mono">{path}</code> · {t(what)}
            </li>
          ))}
        </ul>
        <p className="font-medium text-ink-900">{t('Order (a key that can place orders)')}</p>
        <ul className="list-disc space-y-1 pl-5">
          {WRITE_ENDPOINTS.map(([path, what]) => (
            <li key={path}>
              <code className="font-mono">{path}</code> · {t(what)}
            </li>
          ))}
        </ul>
        <pre
          tabIndex={0}
          aria-label={t('Example order')}
          className="overflow-x-auto rounded-md bg-paper-sunken p-3 font-mono text-xs text-ink-900 focus-visible:outline-2 focus-visible:outline-heat-500"
        >
          {ORDER_EXAMPLE}
        </pre>
        <p>
          {t(
            'Send the same externalId again and you get the same order back: retrying is safe. Orders are paid from your balance when it covers them; otherwise pay them in your panel. Production starts once paid.'
          )}
        </p>
        <p>
          {t(
            'Webhook events: order.created, order.status_changed, order.shipped (with the tracking number, to tell your customer) and order.cancelled.'
          )}
        </p>
        <p>
          {t(
            'Webhook requests carry a Fabrmatch-Signature header: t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<raw body>" with your signing secret>. Reject requests older than five minutes and answer with a 2xx status. Events can arrive more than once and out of order; use the event id to ignore repeats.'
          )}
        </p>
        <p>{t('Neither the API nor webhooks ever include buyer or maker identity.')}</p>
      </CardContent>
    </Card>
  )
}

export default function Developers({
  keys,
  endpoints,
  deliveries,
  newApiKey,
  newWebhookSecret,
}: Props) {
  const { t } = useT()
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title={t('Developers')}
        description={t('API keys and webhooks for your own systems.')}
      />
      {newApiKey && (
        <Secret
          title={t('Your new API key')}
          note={t('Copy it now. It will not be shown again.')}
          value={newApiKey}
        />
      )}
      {newWebhookSecret && (
        <Secret
          title={t('Your webhook signing secret')}
          note={t('Copy it now. It will not be shown again.')}
          value={newWebhookSecret.secret}
        />
      )}
      <KeysCard keys={keys} />
      <WebhooksCard endpoints={endpoints} />
      <DeliveriesCard deliveries={deliveries} />
      <DocsCard />
    </div>
  )
}

Developers.layout = 'dashboard'
Developers.dashboardProps = { navItems: sellerNav, title: 'Seller' }
