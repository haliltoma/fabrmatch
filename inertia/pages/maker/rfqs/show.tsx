import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { makerNav } from '~/lib/nav'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { PageHeader } from '~/components/page_header'
import { RfqStatus } from '~/components/rfq_status'
import { formatDateTime } from '~/lib/format'
import { useT } from '~/lib/i18n'

type Rfq = {
  id: number
  code: string
  title: string
  material: string
  color: string | null
  technology: string
  quantity: number
  shipCountry: string
  bidsCloseAt: string
  maxLeadDays: number
  status: string
  volumeMm3: number | null
  bboxMm: number[] | null
}
type Bid = { unitPriceMinor: number; leadDays: number; note: string | null; status: string }

export default function MakerRfqShow({ rfq, bid }: { rfq: Rfq; bid: Bid | null }) {
  const { t } = useT()

  const [price, setPrice] = useState(bid ? (bid.unitPriceMinor / 100).toFixed(2) : '')
  const [leadDays, setLeadDays] = useState(bid ? String(bid.leadDays) : String(rfq.maxLeadDays))
  const [note, setNote] = useState(bid?.note ?? '')
  const open = rfq.status === 'open'
  const locked = bid?.status === 'won' || bid?.status === 'lost'
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/maker/rfqs" className="text-sm text-ink-700 hover:underline">
        {t('← All requests')}
      </Link>
      <PageHeader
        title={rfq.title}
        description={`${rfq.code} · ${rfq.technology} · ${rfq.material}${rfq.color ? ` · ${rfq.color}` : ''}`}
        action={<RfqStatus status={rfq.status} />}
      />
      <Card>
        <CardContent className="space-y-1 pt-6 text-sm text-ink-700">
          <p>
            <strong className="text-ink-900">{rfq.quantity}</strong> units, delivered to{' '}
            {rfq.shipCountry}, needed within {rfq.maxLeadDays} days of the decision.
          </p>
          {rfq.bboxMm && (
            <p>
              {t('One part: {size} mm', { size: rfq.bboxMm.map((d) => Math.round(d)).join(' × ') })}
              {rfq.volumeMm3 ? `, ${Math.round(rfq.volumeMm3 / 1000)} cm³` : ''}
            </p>
          )}
          <p>{t('Offers close {when}.', { when: formatDateTime(rfq.bidsCloseAt) })}</p>
          <p className="text-xs text-ink-600">
            {t(
              'You never see who the buyer is. The model file itself is shared only if your offer is chosen and the order is paid.'
            )}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{bid ? t('Your offer') : t('Send an offer')}</CardTitle>
        </CardHeader>
        <CardContent>
          {locked ? (
            <p className="text-ink-700">
              {bid?.status === 'won'
                ? t('Your offer was chosen. Once the buyer pays you receive the job to accept.')
                : t('Another offer was chosen.')}
            </p>
          ) : (
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault()
                router.post(`/maker/rfqs/${rfq.id}/bid`, {
                  price: Number(price),
                  leadDays: Number(leadDays),
                  note: note || undefined,
                })
              }}
            >
              <div className="space-y-1">
                <Label htmlFor="b-price">{t('Price per unit (TRY)')}</Label>
                <Input
                  id="b-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  disabled={!open}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="b-days">{t('Days to deliver')}</Label>
                <Input
                  id="b-days"
                  type="number"
                  min="1"
                  max={rfq.maxLeadDays}
                  value={leadDays}
                  disabled={!open}
                  onChange={(e) => setLeadDays(e.target.value)}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="b-note">{t('Note (optional; no phone numbers or links)')}</Label>
                <Input
                  id="b-note"
                  value={note}
                  maxLength={300}
                  disabled={!open}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              <p className="text-xs text-ink-600 sm:col-span-2">
                {t(
                  'This is what you receive per unit. The platform fee and shipping are added on top for the buyer.'
                )}
              </p>
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={!open || price === ''}>
                  {bid && bid.status === 'active' ? t('Update offer') : t('Send offer')}
                </Button>
                {bid?.status === 'active' && open && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.post(`/maker/rfqs/${rfq.id}/withdraw`)}
                  >
                    {t('Withdraw')}
                  </Button>
                )}
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

MakerRfqShow.layout = 'dashboard'
MakerRfqShow.dashboardProps = { navItems: makerNav, title: 'Maker Panel' }
