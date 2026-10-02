import { useEffect, useState } from 'react'
import { useHydrated } from '~/lib/use_hydrated'
import { router } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { toast } from 'sonner'
import { Camera, Check, Clock, Download, Loader2, MapPin } from 'lucide-react'
import { makerNav } from '~/lib/nav'
import { postJson } from '~/lib/api'
import { formatDate, formatDateTime, formatMoney } from '~/lib/format'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Badge } from '~/components/ui/badge'
import { PageHeader } from '~/components/page_header'
import { useT } from '~/lib/i18n'

type OfferItem = {
  technology: string
  material: string
  color: string | null
  finishing: string | null
  finishingColour?: string | null
  quantity: number
  estGrams: number
  estPrintMinutes: number
  bboxMm: number[] | null
}

type OfferData = {
  /** what this maker is paid for the parts (order currency); null = the order's maker share */
  payMinor: number | null
  id: string
  round: number
  status: string
  expiresAt: string
  slotDate: string | null
  order: {
    code: string
    shipCountry: string
    currency: string
    manufacturerShareMinor: number
    items: OfferItem[]
  }
}

type ShipTo = {
  fullName: string
  line1: string
  line2: string | null
  district: string | null
  city: string
  postalCode: string
  country: string
} | null

type JobData = {
  id: string
  status: string
  acceptedAt: string
  dueAt: string
  shippedAt: string | null
  carrier: string | null
  trackingNumber: string | null
  rating: number | null
  qcPhotoCount: number
  dispute: {
    id: string
    status: string
    reason: string
    manufacturerResponse: string | null
    resolution: string | null
    refundMinor: number
    evidence: Array<{ id: string; note: string | null; by: 'buyer' | 'manufacturer' }>
  } | null
  order: {
    id: string
    code: string
    status: string
    shipCountry: string
    currency: string
    manufacturerShareMinor: number
    items: OfferItem[]
    shipTo: ShipTo
  }
  files: Array<{
    grantId: string
    label: string
    expiresAt: string
    downloadsLeft: number
    isValid: boolean
  }>
}

const JOB_BADGES: Record<string, 'default' | 'secondary' | 'warning' | 'success'> = {
  accepted: 'secondary',
  printing: 'warning',
  produced: 'default',
  shipped: 'default',
  delivered: 'success',
  cancelled: 'secondary',
}

function useCountdown(expiresAt: string) {
  const target = new Date(expiresAt).getTime()
  const [remaining, setRemaining] = useState(() => Math.max(0, target - Date.now()))

  useEffect(() => {
    const timer = setInterval(() => setRemaining(Math.max(0, target - Date.now())), 1000)
    return () => clearInterval(timer)
  }, [target])

  return remaining
}

function Countdown({ expiresAt }: { expiresAt: string }) {
  const { t } = useT()

  const hydrated = useHydrated()
  const remaining = useCountdown(expiresAt)
  const expired = hydrated && remaining <= 0

  // The server expires the offer and opens the next round — refresh to see it.
  useEffect(() => {
    if (expired) router.reload({ only: ['offers', 'jobs'] })
  }, [expired])

  const minutes = Math.floor(remaining / 60000)
  const seconds = Math.floor((remaining % 60000) / 1000)

  return (
    <span
      className={`inline-flex items-center gap-1 text-sm font-medium ${
        expired ? 'text-ink-600' : hydrated && minutes < 5 ? 'text-danger' : 'text-ink-700'
      }`}
    >
      <Clock className="h-3.5 w-3.5" />
      {!hydrated
        ? '–:––'
        : expired
          ? t('Expired')
          : `${minutes}:${String(seconds).padStart(2, '0')}`}
    </span>
  )
}

function ItemList({ items }: { items: OfferItem[] }) {
  const { t } = useT()

  return (
    <ul className="space-y-1 text-sm text-ink-700">
      {items.map((item, i) => (
        <li key={i} className="flex flex-wrap items-baseline gap-x-3">
          <span className="font-medium text-ink-900">
            {item.material}
            {item.color ? ` · ${item.color}` : ''}
            {item.finishing
              ? ` · ${t(item.finishing)}${item.finishingColour ? ` (${t(item.finishingColour)})` : ''}`
              : ''}
          </span>
          <span>×{item.quantity}</span>
          <span className="text-ink-600">~{item.estGrams} g</span>
          <span className="text-ink-600">
            {t('{v1}h print', { v1: Math.round(item.estPrintMinutes / 60) })}
          </span>
          {item.bboxMm && (
            <span className="text-ink-600">
              {t('{v2} mm', { v2: item.bboxMm.map((d) => Math.round(d)).join('×') })}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}

function OfferCard({ offer }: { offer: OfferData }) {
  const { t } = useT()

  const [busy, setBusy] = useState(false)

  function respond(action: 'accept' | 'decline') {
    setBusy(true)
    router.post(`/maker/offers/${offer.id}/${action}`, {}, { onFinish: () => setBusy(false) })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base">{offer.order.code}</CardTitle>
          <p className="text-xs text-ink-600">
            {t('Round {round} · Ships to {country}', {
              round: offer.round,
              country: offer.order.shipCountry,
            })}
            {offer.slotDate ? ` · ${t('Slot {date}', { date: formatDate(offer.slotDate) })}` : ''}
          </p>
        </div>
        <Countdown expiresAt={offer.expiresAt} />
      </CardHeader>
      <CardContent className="space-y-4">
        <ItemList items={offer.order.items} />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-ink-600">{t('Your payout')}</p>
            <p className="text-lg font-semibold text-ink-900">
              {formatMoney(
                offer.payMinor ?? offer.order.manufacturerShareMinor,
                offer.order.currency
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={busy} onClick={() => respond('decline')}>
              {t('Decline')}
            </Button>
            <Button size="sm" disabled={busy} onClick={() => respond('accept')}>
              {t('Accept')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function QcPhotos({ job }: { job: JobData }) {
  const { t } = useT()

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return
    setBusy(true)
    setError(null)
    try {
      for (const file of Array.from(files)) {
        if (!PHOTO_TYPES.includes(file.type)) throw new Error('Photos must be JPG, PNG or WebP')
        if (file.size > 10 * 1024 * 1024) throw new Error('Photos must be 10 MB or smaller')
        const { storageKey, signedUrl } = await postJson<{ storageKey: string; signedUrl: string }>(
          `/maker/jobs/${job.id}/qc/upload-url`,
          { contentType: file.type }
        )
        const put = await fetch(signedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        })
        if (!put.ok) throw new Error('Upload failed, try again')
        await postJson(`/maker/jobs/${job.id}/qc`, { storageKey })
      }
      router.reload()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const done = job.qcPhotoCount > 0
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-ink-900">
        <span className="mr-1.5 font-mono text-xs text-ink-500">1</span>
        {t('Photograph the finished part')}
      </p>
      <p className="text-xs text-ink-600">
        {t(
          'At least one photo. It stays with the order and protects you if the buyer reports a problem.'
        )}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <input
          id={`qc-${job.id}`}
          type="file"
          accept={PHOTO_TYPES.join(',')}
          multiple
          disabled={busy}
          onChange={(e) => upload(e.target.files)}
          className="peer sr-only"
        />
        <label
          htmlFor={`qc-${job.id}`}
          className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border-2 border-ink-900 bg-paper-raised px-3 text-sm font-semibold text-ink-900 peer-focus-visible:ring-2 peer-focus-visible:ring-heat-500 peer-focus-visible:ring-offset-2 peer-disabled:cursor-wait peer-disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Camera className="h-4 w-4" aria-hidden />
          )}
          {busy ? t('Uploading…') : done ? t('Add more photos') : t('Add photos')}
        </label>
        <span
          className={`inline-flex items-center gap-1.5 text-sm ${done ? 'font-semibold text-fil-700' : 'text-ink-600'}`}
        >
          {done && <Check className="h-4 w-4" aria-hidden />}
          {done ? t('{count} added', { count: job.qcPhotoCount }) : t('No photo yet')}
        </span>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {t(error)}
        </p>
      )}
    </div>
  )
}

function ShipForm({ job }: { job: JobData }) {
  const { t } = useT()

  const [carrier, setCarrier] = useState('Yurtiçi Kargo')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [busy, setBusy] = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    router.post(
      `/maker/jobs/${job.id}/ship`,
      { carrier, trackingNumber },
      { onFinish: () => setBusy(false) }
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-md border border-line bg-paper-sunken p-4">
      <QcPhotos job={job} />
      <p className="text-sm font-semibold text-ink-900">
        <span className="mr-1.5 font-mono text-xs text-ink-500">2</span>
        {t('Hand it to the carrier')}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor={`carrier-${job.id}`}>{t('Carrier')}</Label>
          <Input
            id={`carrier-${job.id}`}
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor={`tracking-${job.id}`}>{t('Tracking number')}</Label>
          <Input
            id={`tracking-${job.id}`}
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            required
            placeholder="e.g. 1234567890"
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          disabled={busy || job.qcPhotoCount < 1}
          aria-describedby={job.qcPhotoCount < 1 ? `ship-why-${job.id}` : undefined}
        >
          {t('Mark as shipped')}
        </Button>
        {job.qcPhotoCount < 1 && (
          <p id={`ship-why-${job.id}`} className="text-sm text-ink-600">
            {t('Add a photo of the part first.')}
          </p>
        )}
      </div>
    </form>
  )
}

async function downloadGrant(grantId: string) {
  try {
    const { url } = await postJson<{ url: string }>(`/maker/grants/${grantId}/download`)
    window.open(url, '_blank', 'noopener')
  } catch (error) {
    toast.error((error as Error).message)
  }
}

function FileDownloads({ files }: { files: JobData['files'] }) {
  const { t } = useT()

  if (files.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2">
      {files.map((file) => (
        <Button
          key={file.grantId}
          type="button"
          variant="outline"
          size="sm"
          disabled={!file.isValid || file.downloadsLeft === 0}
          onClick={() => downloadGrant(file.grantId)}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" />
          {file.label}
          <span className="ml-1.5 text-xs text-ink-600">
            {t('{downloadsLeft} left · {date}', {
              downloadsLeft: file.downloadsLeft,
              date: formatDate(file.expiresAt),
            })}
          </span>
        </Button>
      ))}
    </div>
  )
}

function ShipToCard({ shipTo }: { shipTo: ShipTo }) {
  const { t } = useT()

  if (!shipTo) return null
  return (
    <div className="rounded-md border border-line p-3 text-sm text-ink-700">
      <p className="mb-1 flex items-center gap-1 text-xs font-medium text-ink-600">
        <MapPin className="h-3.5 w-3.5" /> {t('Ship to')}
      </p>
      <p className="font-medium text-ink-900">{shipTo.fullName}</p>
      <p>
        {shipTo.line1}
        {shipTo.line2 ? `, ${shipTo.line2}` : ''}
        {shipTo.district ? `, ${shipTo.district}` : ''}
      </p>
      <p>
        {shipTo.postalCode} {shipTo.city}, {shipTo.country}
      </p>
    </div>
  )
}

function DisputeBox({ dispute }: { dispute: NonNullable<JobData['dispute']> }) {
  const { t } = useT()

  const [text, setText] = useState(dispute.manufacturerResponse ?? '')
  const [busy, setBusy] = useState(false)

  return (
    <div className="space-y-2 rounded-md border border-danger/40 bg-danger-soft p-3 text-sm">
      <div className="flex items-center justify-between">
        <p className="font-medium text-danger">{t('Dispute — payment on hold')}</p>
        <Badge variant={dispute.status === 'resolved' ? 'success' : 'destructive'}>
          {t(dispute.status)}
        </Badge>
      </div>
      <p className="whitespace-pre-wrap text-ink-800">{dispute.reason}</p>
      <p className="text-xs text-ink-600">
        {t('{length} photo(s) attached', { length: dispute.evidence.length })}
      </p>

      {dispute.status === 'resolved' ? (
        <p className="font-medium text-ink-900">
          {t('Decision: {resolution}', {
            resolution: t(dispute.resolution?.replace('_', ' ') ?? ''),
          })}
        </p>
      ) : (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault()
            setBusy(true)
            router.post(
              `/maker/disputes/${dispute.id}/respond`,
              { response: text },
              { onFinish: () => setBusy(false) }
            )
          }}
        >
          <textarea
            className="flex min-h-20 w-full rounded-md border border-line bg-paper-raised px-3 py-2 text-sm"
            minLength={5}
            maxLength={2000}
            required
            placeholder={t('Your side of the story')}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Button type="submit" size="sm" disabled={busy}>
            {dispute.manufacturerResponse ? t('Update response') : t('Send response')}
          </Button>
        </form>
      )}
    </div>
  )
}

type ShopPhoto = { id: string; url: string; status: string | null }

/** A shop product was printed: the maker may offer a QC photo; an admin checks it first. */
function ShopPhotos({ photos }: { photos: ShopPhoto[] }) {
  const { t } = useT()
  const label: Record<string, string> = {
    pending: t('Waiting for review'),
    approved: t('In the shop'),
    rejected: t('Not used'),
  }
  return (
    <div className="space-y-2 rounded-md border border-line p-3">
      <p className="text-sm font-medium text-ink-900">{t('Show your print in the shop')}</p>
      <p className="text-xs text-ink-600">
        {t(
          'Offer a clear photo of just the part. We check every photo and never show anything that identifies you.'
        )}
      </p>
      <ul className="flex flex-wrap gap-3">
        {photos.map((p) => (
          <li key={p.id} className="w-24 space-y-1">
            <img
              src={p.url}
              alt={t('Photo of the finished part')}
              loading="lazy"
              className="h-24 w-24 rounded-md border border-line object-cover"
            />
            {p.status ? (
              <p className="text-xs text-ink-600">{label[p.status] ?? p.status}</p>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => router.post(`/maker/qc-photos/${p.id}/offer`)}
              >
                {t('Offer')}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function JobCard({ job, shopPhotos }: { job: JobData; shopPhotos?: ShopPhoto[] }) {
  const { t } = useT()

  const [checkedAt] = useState(() => Date.now())
  const overdue =
    new Date(job.dueAt).getTime() < checkedAt &&
    job.status !== 'shipped' &&
    job.status !== 'delivered'

  function advance(action: 'printing' | 'produced') {
    router.post(`/maker/jobs/${job.id}/${action}`)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base">{job.order.code}</CardTitle>
          <p className="text-xs text-ink-600">
            {t('Accepted {when} · Due {date}', {
              when: formatDateTime(job.acceptedAt),
              date: formatDate(job.dueAt),
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {overdue && <Badge variant="destructive">{t('Overdue')}</Badge>}
          <Badge variant={JOB_BADGES[job.status] ?? 'secondary'}>{t(job.status)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ItemList items={job.order.items} />
        {job.dispute && <DisputeBox dispute={job.dispute} />}
        <FileDownloads files={job.files} />
        <ShipToCard shipTo={job.order.shipTo} />
        {shopPhotos && shopPhotos.length > 0 && <ShopPhotos photos={shopPhotos} />}
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <a
            href={`/maker/jobs/${job.id}/packing-slip`}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-ink-800 underline"
          >
            {t('Print the packing card for the parcel')}
          </a>
          <Link
            href={`/maker/orders/${job.order.id}/messages`}
            className="text-sm font-medium text-heat-700 underline"
          >
            {t('Messages with the buyer')}
          </Link>
        </div>

        {(job.status === 'shipped' || job.status === 'delivered') && (
          <p className="text-sm text-ink-700">
            {t('Shipped via')} <span className="font-medium">{job.carrier}</span> {t('· Tracking')}{' '}
            <span className="font-medium">{job.trackingNumber}</span>
          </p>
        )}
        {job.rating && (
          <p className="text-sm text-ink-700">
            {t('Buyer rating:')}{' '}
            <span className="font-medium text-amber-ink">{'★'.repeat(job.rating)}</span>
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {job.status === 'accepted' && (
            <Button size="sm" onClick={() => advance('printing')}>
              {t('Start printing')}
            </Button>
          )}
          {job.status === 'printing' && (
            <Button size="sm" onClick={() => advance('produced')}>
              {t('Mark produced')}
            </Button>
          )}
          {job.status === 'produced' && <ShipForm job={job} />}
        </div>
      </CardContent>
    </Card>
  )
}

export type WorkPageProps = {
  offers: OfferData[]
  jobs: JobData[]
  offersChannel: string
  shopPhotos: Record<string, ShopPhoto[]>
}

export default function WorkIndex({ offers, jobs, shopPhotos }: WorkPageProps) {
  const { t } = useT()

  const activeJobs = jobs.filter((j) => j.status !== 'delivered' && j.status !== 'cancelled')
  const doneJobs = jobs.filter((j) => j.status === 'delivered' || j.status === 'cancelled')

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('Work')}
        description={t('Offers matched to you, and the jobs you are producing.')}
      />

      <section id="offers" className="scroll-mt-20 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-600">
          {t('Offers ({length})', { length: offers.length })}
        </h2>
        {offers.length === 0 ? (
          <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-line text-sm text-ink-600">
            {t("No pending offers — you'll be notified when an order matches.")}
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {offers.map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        )}
      </section>

      <section id="jobs" className="scroll-mt-20 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-600">
          {t('Active jobs ({length})', { length: activeJobs.length })}
        </h2>
        {activeJobs.length === 0 ? (
          <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-line text-sm text-ink-600">
            {t('No active jobs. Accept an offer to start production.')}
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {activeJobs.map((job) => (
              <JobCard key={job.id} job={job} shopPhotos={shopPhotos[job.id]} />
            ))}
          </div>
        )}
      </section>

      {doneJobs.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-600">
            {t('History ({length})', { length: doneJobs.length })}
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {doneJobs.map((job) => (
              <JobCard key={job.id} job={job} shopPhotos={shopPhotos[job.id]} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

WorkIndex.layout = 'dashboard'
WorkIndex.dashboardProps = { navItems: makerNav, title: 'Maker' }
