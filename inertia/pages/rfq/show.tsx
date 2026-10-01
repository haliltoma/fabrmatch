import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { sellerNav } from '~/lib/nav'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Money } from '~/components/money'
import { PageHeader } from '~/components/page_header'
import { RfqStatus } from '~/components/rfq_status'
import { formatDateTime } from '~/lib/format'
import { useT } from '~/lib/i18n'

type Rfq = {
  id: string
  code: string
  title: string
  material: string
  color: string | null
  quantity: number
  shipCountry: string
  bidsCloseAt: string
  maxLeadDays: number
  status: string
  orderId: string | null
  fileName: string | null
}
type Bid = {
  id: string
  label: string
  unitPriceMinor: number
  leadDays: number
  note: string | null
  status: string
  trustTier: number
  avgRating: number | null
  completedJobs: number
}

const TIERS = ['New', 'Verified', 'Trusted', 'Partner']

function AwardForm({ rfq, bid, onCancel }: { rfq: Rfq; bid: Bid; onCancel: () => void }) {
  const { t } = useT()

  const [a, setA] = useState({
    fullName: '',
    line1: '',
    city: '',
    postalCode: '',
    country: rfq.shipCountry,
    phone: '',
  })
  const set = (k: keyof typeof a) => (v: string) => setA((x) => ({ ...x, [k]: v }))
  return (
    <form
      className="mt-4 grid gap-3 rounded-lg border border-line bg-paper-sunken p-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault()
        router.post(`/rfqs/${rfq.id}/award`, {
          bidId: bid.id,
          shippingAddress: { ...a, phone: a.phone || undefined },
        })
      }}
    >
      <p className="text-sm text-ink-800 sm:col-span-2">
        {t('Where should {v2} be delivered? The maker only sees this address once you have paid.', {
          v2: bid.label.toLowerCase(),
        })}
      </p>
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
        <div key={key} className="space-y-1">
          <Label htmlFor={`aw-${key}`}>{label}</Label>
          <Input id={`aw-${key}`} value={a[key]} onChange={(e) => set(key)(e.target.value)} />
        </div>
      ))}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit">{t('Choose this offer')}</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t('Back')}
        </Button>
      </div>
    </form>
  )
}

export default function RfqShow({ rfq, bids }: { rfq: Rfq; bids: Bid[] }) {
  const { t } = useT()

  const [choosing, setChoosing] = useState<string | null>(null)
  const decidable = rfq.status === 'open' || rfq.status === 'closed'
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={rfq.title}
        description={`${rfq.code} · ${rfq.material}${rfq.color ? ` · ${rfq.color}` : ''} × ${rfq.quantity} · to ${rfq.shipCountry}`}
        action={<RfqStatus status={rfq.status} />}
      />
      <Card>
        <CardContent className="space-y-1 pt-6 text-sm text-ink-700">
          <p>
            {t('Offers until {when}. Needed within {maxLeadDays} days.', {
              when: formatDateTime(rfq.bidsCloseAt),
              maxLeadDays: rfq.maxLeadDays,
            })}
          </p>
          {rfq.fileName && <p>{t('Model: {fileName}', { fileName: rfq.fileName })}</p>}
          {rfq.orderId && (
            <p>
              <Link href={`/orders/${rfq.orderId}`} className="font-medium text-ink-900 underline">
                {t('Go to your order')}
              </Link>
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('Offers')}</CardTitle>
        </CardHeader>
        <CardContent>
          {bids.length === 0 ? (
            <p className="text-ink-700">
              {t('No offers yet. Invited makers are notified; offers appear here as they come in.')}
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {bids.map((b) => (
                <li key={b.id} className="py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-ink-900">
                        {b.label}{' '}
                        {b.status === 'won' && <Badge variant="success">{t('Chosen')}</Badge>}
                      </p>
                      <p className="text-sm text-ink-700">
                        <Money minor={b.unitPriceMinor} /> {t('per unit')} ·{' '}
                        {t('{days} days', { days: b.leadDays })}
                      </p>
                      <p className="text-xs text-ink-600">
                        {t('{tier} maker · {count} jobs done', {
                          tier: t(TIERS[b.trustTier] ?? 'New'),
                          count: b.completedJobs,
                        })}
                        {b.avgRating !== null
                          ? ` · ${t('rated {rating}', { rating: b.avgRating.toFixed(1) })}`
                          : ''}
                      </p>
                      {b.note && <p className="mt-1 text-sm text-ink-800">“{b.note}”</p>}
                    </div>
                    {decidable && b.status === 'active' && choosing !== b.id && (
                      <Button size="sm" onClick={() => setChoosing(b.id)}>
                        {t('Choose')}
                      </Button>
                    )}
                  </div>
                  {choosing === b.id && (
                    <AwardForm rfq={rfq} bid={b} onCancel={() => setChoosing(null)} />
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-ink-600">
            {t(
              'Prices are what the maker asks per unit. The platform fee, shipping and VAT are added when you choose, and you see the final total on your order before paying.'
            )}
          </p>
        </CardContent>
      </Card>

      {decidable && (
        <Button
          variant="outline"
          onClick={() => {
            if (window.confirm(t('Cancel this request? Offers will be closed.'))) {
              router.post(`/rfqs/${rfq.id}/cancel`)
            }
          }}
        >
          {t('Cancel request')}
        </Button>
      )}
    </div>
  )
}

RfqShow.layout = 'dashboard'
RfqShow.dashboardProps = { navItems: sellerNav, title: 'Seller' }
