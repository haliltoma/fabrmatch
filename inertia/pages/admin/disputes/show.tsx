import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { ArrowLeft } from 'lucide-react'
import { adminNav } from '~/lib/nav'
import { formatDateTime, formatMoney } from '~/lib/format'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { useT } from '~/lib/i18n'
import { OrderCode } from '~/components/order_code'

type Evidence = {
  id: number
  note: string | null
  by: 'buyer' | 'manufacturer'
  createdAt: string | null
}

type DisputeData = {
  id: number
  status: string
  reason: string
  manufacturerResponse: string | null
  resolution: string | null
  refundMinor: number
  adminNote: string | null
  createdAt: string | null
  evidence: Evidence[]
  order: {
    code: string
    currency: string
    totalMinor: number
    platformFeeMinor?: number
    productionJob: { manufacturerAlias: string | null; status: string } | null
  }
}

type Resolution = 'full_refund' | 'partial_refund' | 'release' | 'reproduce'

const OPTIONS: Array<{ value: Resolution; label: string; hint: string }> = [
  {
    value: 'full_refund',
    label: 'Full refund',
    hint: 'Buyer gets everything back, nobody is paid.',
  },
  {
    value: 'partial_refund',
    label: 'Partial refund',
    hint: 'Taken from the manufacturer share; the rest is paid out.',
  },
  { value: 'release', label: 'Release payment', hint: 'No fault found — pay out as normal.' },
  {
    value: 'reproduce',
    label: 'Reprint',
    hint: 'The part is made again by a different maker. Payment stays held; this maker is not paid. Once per order.',
  },
]

function ResolveForm({ dispute }: { dispute: DisputeData }) {
  const { t } = useT()

  const [resolution, setResolution] = useState<Resolution>('release')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    router.post(
      `/admin/disputes/${dispute.id}/resolve`,
      {
        resolution,
        refundMinor: resolution === 'partial_refund' ? Math.round(Number(amount) * 100) : undefined,
        note: note || undefined,
      },
      { onFinish: () => setBusy(false) }
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        {OPTIONS.map((o) => (
          <label key={o.value} className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="radio"
              name="resolution"
              className="mt-1"
              checked={resolution === o.value}
              onChange={() => setResolution(o.value)}
            />
            <span>
              <span className="font-medium text-ink-900">{t(o.label)}</span>
              <span className="block text-ink-600">{t(o.hint)}</span>
            </span>
          </label>
        ))}
      </div>

      {resolution === 'partial_refund' && (
        <div>
          <Label htmlFor="refund">
            {t('Refund amount ({currency})', { currency: dispute.order.currency })}
          </Label>
          <Input
            id="refund"
            type="number"
            min="0.01"
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
      )}

      <div>
        <Label htmlFor="note">{t('Decision note (optional)')}</Label>
        <textarea
          id="note"
          className="flex min-h-20 w-full rounded-md border border-line bg-paper-raised px-3 py-2 text-sm"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <Button type="submit" disabled={busy}>
        {t('Apply decision')}
      </Button>
    </form>
  )
}

export default function AdminDisputesShow({
  dispute,
  evidenceUrls,
}: {
  dispute: DisputeData
  evidenceUrls: Record<string, string>
}) {
  const { t } = useT()

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href="/admin/disputes"
        className="inline-flex items-center gap-1 text-sm text-ink-600 hover:text-ink-800"
      >
        <ArrowLeft className="h-4 w-4" /> {t('All disputes')}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink-900">
            <OrderCode code={dispute.order.code} className="text-3xl font-semibold" />
          </h1>
          <p className="text-ink-600">
            {t('Opened {when} · total {amount}', {
              when: formatDateTime(dispute.createdAt),
              amount: formatMoney(dispute.order.totalMinor, dispute.order.currency),
            })}
            {dispute.order.productionJob?.manufacturerAlias
              ? ` · ${t('Maker {alias}', { alias: dispute.order.productionJob.manufacturerAlias })}`
              : ''}
          </p>
        </div>
        <Badge variant={dispute.status === 'resolved' ? 'success' : 'destructive'}>
          {t(dispute.status)}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Buyer's complaint")}</CardTitle>
        </CardHeader>
        <CardContent className="whitespace-pre-wrap text-sm text-ink-800">
          {dispute.reason}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Manufacturer's response")}</CardTitle>
        </CardHeader>
        <CardContent className="whitespace-pre-wrap text-sm text-ink-800">
          {dispute.manufacturerResponse ?? (
            <span className="text-ink-600">{t('No response yet.')}</span>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('Evidence ({length})', { length: dispute.evidence.length })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dispute.evidence.length === 0 ? (
            <p className="text-sm text-ink-600">{t('No photos uploaded.')}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {dispute.evidence.map((e) => (
                <figure key={e.id} className="space-y-1">
                  <a href={evidenceUrls[e.id]} target="_blank" rel="noopener noreferrer">
                    <img
                      src={evidenceUrls[e.id]}
                      alt={e.note ?? `Evidence from the ${e.by}`}
                      className="h-48 w-full rounded-md border border-line object-cover"
                    />
                  </a>
                  <figcaption className="text-xs text-ink-600">
                    From the {e.by}
                    {e.note ? ` — ${e.note}` : ''}
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('Decision')}</CardTitle>
        </CardHeader>
        <CardContent>
          {dispute.status === 'resolved' ? (
            <div className="space-y-1 text-sm text-ink-800">
              <p className="font-medium">
                {dispute.resolution?.replace('_', ' ')}
                {dispute.refundMinor > 0
                  ? ` — ${formatMoney(dispute.refundMinor, dispute.order.currency)} refunded`
                  : ''}
              </p>
              {dispute.adminNote && <p className="text-ink-600">{dispute.adminNote}</p>}
            </div>
          ) : (
            <ResolveForm dispute={dispute} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

AdminDisputesShow.layout = 'dashboard'
AdminDisputesShow.dashboardProps = { navItems: adminNav, title: 'Admin' }
