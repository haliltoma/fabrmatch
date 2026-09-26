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

type Key = {
  id: number
  name: string
  prefix: string
  lastUsedAt: string | null
  revoked: boolean
  createdAt: string
}
type Endpoint = {
  id: number
  url: string
  isActive: boolean
  disabledReason: string | null
  consecutiveFailures: number
}
type Delivery = {
  id: number
  endpointId: number
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
  newWebhookSecret: { endpointId: number; secret: string } | null
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
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('API keys')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-ink-700">
          {t('Read your orders and products from your own systems. Keys are read-only.')}{' '}
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
                    {k.name} {k.revoked && <Badge variant="secondary">{t('Revoked')}</Badge>}
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
            router.post('/seller/developers/keys', { name }, { onSuccess: () => setName('') })
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
          {t('We send a signed POST to your URL whenever the status of one of your sales changes.')}
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
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <code className="font-mono">GET /api/v1/orders</code> ·{' '}
            <code className="font-mono">?page=</code> · <code className="font-mono">?status=</code>
          </li>
          <li>
            <code className="font-mono">GET /api/v1/orders/:id</code>
          </li>
          <li>
            <code className="font-mono">GET /api/v1/products</code>
          </li>
        </ul>
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
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
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
