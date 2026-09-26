import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { ArrowLeft, Clock, SearchX, Sparkles } from 'lucide-react'
import { adminNav } from '~/lib/nav'
import { formatDate, formatDateTime } from '~/lib/format'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { EmptyState } from '~/components/empty_state'
import { Money } from '~/components/money'
import { OrderCode } from '~/components/order_code'
import { StatusBadge } from '~/components/status_badge'
import { useT } from '~/lib/i18n'

type Maker = {
  id: number
  alias: string
  name: string | null
  city: string | null
  trustTier: number
  label: string
}

type Suggestion = {
  manufacturerProfileId: number
  maker: Maker
  printer: string
  earliestSlot: string
  score: number
  parts: { quality: number; onTime: number; distance: number; load: number }
  stats: {
    completedJobs: number
    avgRating: number | null
    onTimeRate: number | null
    disputeRate: number
    activeJobs: number
    sameCity: boolean
  }
  isNewMaker: boolean
}

type Reason = { code: string; [key: string]: string | number | string[] | number[] }

type Verdict = {
  manufacturerProfileId: number
  alias: string
  name: string | null
  city: string | null
  trustTier: number
  reasons: Reason[]
  printers: { printerId: number; name: string; reasons: Reason[] }[]
  blocked: boolean
}

type Pick = { id: number; label: string; missing: string[] }

const HARD = new Set(['is_buyer', 'is_seller', 'suspended', 'no_printer'])

/** The unmet rules an override would ignore: the maker's own, plus its closest printer's. */
function missingFor(v: Verdict, t: ReturnType<typeof useT>['t']): string[] {
  const best = [...v.printers].sort((a, b) => a.reasons.length - b.reasons.length)[0]
  return [...v.reasons, ...(best?.reasons ?? [])].map((r) => reasonText(r, t))
}

const mm = (dims: unknown) => (dims as number[]).join(' × ')
const money = (minor: unknown) => (Number(minor) / 100).toFixed(2)

/** One line per failed rule, with the numbers needed to fix it. */
function reasonText(r: Reason, t: ReturnType<typeof useT>['t']): string {
  switch (r.code) {
    case 'not_approved':
      return t('Profile not approved yet ({status})', { status: String(r.status) })
    case 'suspended':
      return t('Account suspended')
    case 'is_buyer':
      return t('This is the buyer')
    case 'is_seller':
      return t('This is the seller')
    case 'tier_too_low':
      return t('Tier {have}, order needs {need}', { have: String(r.have), need: String(r.need) })
    case 'other_country':
      return t('In {country}, order ships to {need}', {
        country: String(r.country),
        need: String(r.need),
      })
    case 'already_offered':
      return t('Already had this order ({status})', { status: String(r.status) })
    case 'rfq_awarded_elsewhere':
      return t('The quote request went to another maker')
    case 'no_active_printer':
      return t('No active printer')
    case 'no_printer':
      return t('No printer at all')
    case 'finishing_missing':
      return t('Does not offer: {list}', { list: (r.missing as string[]).join(', ') })
    case 'wrong_technology':
      return t('{have} printer, order needs {need}', { have: String(r.have), need: String(r.need) })
    case 'too_small':
      return t('Part {part} mm does not fit {build} mm', { part: mm(r.part), build: mm(r.build) })
    case 'size_unknown':
      return t('Part size is not known yet')
    case 'material_missing':
      return t('No {material} set up', { material: String(r.material) })
    case 'colour_missing':
      return t('{material} not in {colour}', {
        material: String(r.material),
        colour: String(r.colour),
      })
    case 'price_above_reference':
      return t('{material} at {price}/g, above the {reference}/g reference', {
        material: String(r.material),
        price: money(r.price),
        reference: money(r.reference),
      })
    case 'no_capacity':
      return t('Needs {need} min free in {days} days, best day has {free} min', {
        need: String(r.neededMinutes),
        days: String(r.days),
        free: String(r.bestFreeMinutes),
      })
    case 'print_profile_missing':
      return t('Print profile not offered')
    default:
      return r.code
  }
}

function NotEligible({
  verdicts,
  canOverride,
  onPick,
}: {
  verdicts: Verdict[]
  canOverride: boolean
  onPick: (p: Pick) => void
}) {
  const { t } = useT()
  return (
    <details open={canOverride} className="group rounded-lg border border-line bg-paper-raised">
      <summary className="cursor-pointer list-none px-5 py-4 font-display text-lg font-semibold text-ink-900 [&::-webkit-details-marker]:hidden">
        <span
          className="mr-2 inline-block transition-transform group-open:rotate-90"
          aria-hidden="true"
        >
          ›
        </span>
        {t('Makers who do not fit')}{' '}
        <span className="tabular text-base font-normal text-ink-600">{verdicts.length}</span>
        <span className="block text-sm font-normal text-ink-700">
          {canOverride
            ? t(
                'Manual mode: you can still pick one of these. Each shows what is missing, closest first.'
              )
            : t('Closest first: fix the listed rule and they appear as a suggestion.')}
        </span>
      </summary>
      <ul className="divide-y divide-line border-t border-line">
        {verdicts.map((v) => (
          <li
            key={v.manufacturerProfileId}
            className="flex flex-wrap items-start justify-between gap-4 px-5 py-4 text-sm"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <p>
                <span className="font-mono font-semibold text-ink-900">{v.alias}</span>{' '}
                <span className="text-ink-900">{v.name}</span>{' '}
                <span className="text-ink-600">
                  · {v.city ?? '—'} · {t('Tier {n}', { n: v.trustTier })}
                </span>
              </p>
              {v.reasons.length > 0 && (
                <ul className="list-inside list-disc text-danger">
                  {v.reasons.map((r, i) => (
                    <li key={i}>
                      {reasonText(r, t)}
                      {HARD.has(r.code) && ` — ${t('cannot be overridden')}`}
                    </li>
                  ))}
                </ul>
              )}
              {v.printers.length > 0 && (
                <ul className="space-y-1">
                  {v.printers.map((p) => (
                    <li key={p.printerId} className="text-ink-700">
                      <span className="font-medium text-ink-900">{p.name}:</span>{' '}
                      {p.reasons.length === 0
                        ? t('fits')
                        : p.reasons.map((r) => reasonText(r, t)).join(' · ')}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {canOverride &&
              (v.blocked ? (
                <p className="text-xs text-ink-600">{t('Cannot be matched')}</p>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    onPick({
                      id: v.manufacturerProfileId,
                      label: `${v.alias} · ${v.name ?? ''}`,
                      missing: missingFor(v, t),
                    })
                  }
                >
                  {t('Match anyway')}
                </Button>
              ))}
          </li>
        ))}
      </ul>
    </details>
  )
}

type Props = {
  order: {
    id: number
    code: string
    status: string
    totalMinor: number
    currency: string
    requiredTrustTier: number
    shipCity: string | null
    shipCountry: string
    items: {
      fileName: string
      material: string
      color: string | null
      quantity: number
      technology: string
      estPrintMinutes: number
      sizeMm: (number | null)[]
      finishing: string | null
    }[]
  }
  canOffer: boolean
  canOverride: boolean
  pendingOffer: { maker: Maker; expiresAt: string | null } | null
  suggestions: Suggestion[]
  notEligible: Verdict[]
  history: {
    id: number
    round: number
    status: string
    maker: Maker
    createdAt: string | null
    respondedAt: string | null
  }[]
  productionSlaDays: number
  offerTtlMinutes: number
  autoOffer: boolean
}

// Same weights as `app/services/matching/ranking.ts` (SCORE_WEIGHTS)
const PARTS = [
  { key: 'quality', label: 'Quality', weight: 35, hint: 'Rating × (1 − dispute rate)' },
  { key: 'onTime', label: 'On time', weight: 25, hint: 'Share of jobs shipped by the deadline' },
  { key: 'distance', label: 'Distance', weight: 20, hint: 'Same city as the buyer = full' },
  { key: 'load', label: 'Free hands', weight: 20, hint: 'Fewer running jobs = higher' },
] as const

const pct = (v: number) => `${Math.round(v * 100)}%`

/** One magnitude, one hue: the value is always printed, so the bar never carries meaning alone. */
function Meter({
  label,
  value,
  weight,
  hint,
}: {
  label: string
  value: number
  weight: number
  hint: string
}) {
  const { t } = useT()
  return (
    <div className="space-y-1" title={t(hint)}>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-ink-700">
          {t(label)} <span className="text-ink-500">· {weight}%</span>
        </span>
        <span className="tabular font-medium text-ink-900">{pct(value)}</span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-paper-sunken"
        role="meter"
        aria-label={t(label)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
      >
        <div className="h-full rounded-full bg-ink-700" style={{ width: pct(value) }} />
      </div>
    </div>
  )
}

function SuggestionCard({
  s,
  rank,
  canOffer,
  onPick,
}: {
  s: Suggestion
  rank: number
  canOffer: boolean
  onPick: (s: Suggestion) => void
}) {
  const { t } = useT()
  const facts = [
    t('{n} jobs done', { n: s.stats.completedJobs }),
    s.stats.avgRating === null ? t('no rating yet') : `★ ${s.stats.avgRating.toFixed(1)}`,
    s.stats.onTimeRate === null
      ? t('no deliveries yet')
      : t('{p} on time', { p: pct(s.stats.onTimeRate) }),
    t('{p} disputes', { p: pct(s.stats.disputeRate) }),
    t('{n} running', { n: s.stats.activeJobs }),
  ]
  return (
    <li
      className={`rounded-lg border bg-paper-raised p-5 ${rank === 1 ? 'border-ink-900' : 'border-line'}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-4">
          <span className="font-mono tabular text-sm text-ink-500">#{rank}</span>
          <div className="space-y-1">
            <p className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-semibold text-ink-900">{s.maker.alias}</span>
              <span className="text-ink-900">{s.maker.name}</span>
              {rank === 1 && (
                <span className="rounded-full bg-fil-100 px-2 py-0.5 text-xs font-medium text-fil-600">
                  {t('Best fit')}
                </span>
              )}
              {s.isNewMaker && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-soft px-2 py-0.5 text-xs font-medium text-amber-ink">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  {t('New maker')}
                </span>
              )}
            </p>
            <p className="text-sm text-ink-700">
              {s.maker.city ?? '—'}
              {s.stats.sameCity && ` (${t('same city as the buyer')})`} ·{' '}
              {t('Tier {n}', { n: s.maker.trustTier })}
              {' · '}
              {s.printer} · {t('free from {date}', { date: formatDate(s.earliestSlot) })}
            </p>
            <p className="text-xs text-ink-600">{facts.join(' · ')}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-600">{t('Score')}</p>
          <p className="font-display text-3xl font-semibold tabular text-ink-900">
            {s.score.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        {PARTS.map((p) => (
          <Meter
            key={p.key}
            label={p.label}
            value={s.parts[p.key]}
            weight={p.weight}
            hint={p.hint}
          />
        ))}
      </div>

      {canOffer && (
        <div className="mt-4 flex justify-end">
          <Button variant={rank === 1 ? 'default' : 'outline'} onClick={() => onPick(s)}>
            {t('Match with this maker')}
          </Button>
        </div>
      )}
    </li>
  )
}

export default function AdminMatchingShow({
  order,
  canOffer,
  canOverride,
  pendingOffer,
  suggestions,
  notEligible,
  history,
  productionSlaDays,
  offerTtlMinutes,
}: Props) {
  const { t } = useT()
  const [picked, setPicked] = useState<Pick | null>(null)
  const [sending, setSending] = useState(false)

  const send = () => {
    if (!picked) return
    router.post(
      `/admin/matching/${order.id}/offer`,
      { manufacturerProfileId: picked.id },
      {
        onStart: () => setSending(true),
        onFinish: () => {
          setSending(false)
          setPicked(null)
        },
      }
    )
  }

  return (
    <div className="space-y-8">
      <Link
        href="/admin/matching"
        className="inline-flex items-center gap-1 text-sm text-ink-700 hover:text-ink-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t('Back to matching')}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink-900">
            <OrderCode code={order.code} className="text-3xl font-semibold" />
          </h1>
          <p className="text-ink-700">
            {t('Ships to {city}, {country}', {
              city: order.shipCity ?? '—',
              country: order.shipCountry,
            })}{' '}
            · {t('needs tier {n} or higher', { n: order.requiredTrustTier })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Money
            minor={order.totalMinor}
            currency={order.currency}
            className="font-display text-2xl font-semibold"
          />
          <StatusBadge status={order.status} />
        </div>
      </div>

      <ul className="layer-lines divide-y divide-line rounded-lg border border-line bg-paper-raised">
        {order.items.map((i, idx) => (
          <li
            key={idx}
            className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm"
          >
            <span className="font-medium text-ink-900">{i.fileName}</span>
            <span className="text-ink-700">
              {i.technology} · {i.material}
              {i.color && ` · ${i.color}`} × {i.quantity} ·{' '}
              <span className="tabular">{i.sizeMm.map((d) => d ?? '?').join(' × ')} mm</span> ·{' '}
              {t('~{h} h print', { h: (i.estPrintMinutes / 60).toFixed(1) })}
              {i.finishing && ` · ${i.finishing}`}
            </span>
          </li>
        ))}
      </ul>

      {pendingOffer && (
        <p className="flex items-center gap-2 rounded-md bg-paper-sunken px-4 py-3 text-sm text-ink-700">
          <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
          {t('Offer sent to {maker}. It expires {when}; if they decline it comes back here.', {
            maker: pendingOffer.maker.label,
            when: formatDateTime(pendingOffer.expiresAt),
          })}
        </p>
      )}

      <section className="space-y-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink-900">
            {t('Suggested makers')}{' '}
            <span className="tabular text-base font-normal text-ink-600">{suggestions.length}</span>
          </h2>
          <p className="text-sm text-ink-700">
            {t(
              'Everyone here passes every rule right now: the part fits the printer, the material and colour are set up at or below the reference price, there is free capacity within {days} days, the tier is high enough, and they are not the buyer or seller.',
              { days: productionSlaDays }
            )}
          </p>
        </div>

        {suggestions.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title={t('No maker fits right now')}
            description={
              canOverride
                ? t('No maker passes every rule. In manual mode you can still pick one below.')
                : t(
                    'Makers who already declined or let an offer expire are left out. New capacity or an approved maker makes them show up here.'
                  )
            }
            action={
              <Button asChild variant="outline">
                <Link href="/admin/makers">{t('Open makers')}</Link>
              </Button>
            }
          />
        ) : (
          <ol className="space-y-3">
            {suggestions.map((s, i) => (
              <SuggestionCard
                key={s.manufacturerProfileId}
                s={s}
                rank={i + 1}
                canOffer={canOffer}
                onPick={(x) =>
                  setPicked({ id: x.manufacturerProfileId, label: x.maker.label, missing: [] })
                }
              />
            ))}
          </ol>
        )}
      </section>

      {notEligible.length > 0 && (
        <NotEligible verdicts={notEligible} canOverride={canOverride} onPick={setPicked} />
      )}

      {history.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-ink-900">{t('Offers so far')}</h2>
          <ul className="divide-y divide-line rounded-lg border border-line bg-paper-raised">
            {history.map((h) => (
              <li
                key={h.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm"
              >
                <span>
                  <span className="font-mono text-ink-500">R{h.round}</span>{' '}
                  <span className="text-ink-900">{h.maker.label}</span>
                </span>
                <span className="flex items-center gap-3 text-ink-600">
                  {formatDateTime(h.respondedAt ?? h.createdAt)}
                  <StatusBadge status={h.status} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Dialog open={!!picked} onOpenChange={(open) => !open && setPicked(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Match with {maker}?', { maker: picked?.label ?? '' })}</DialogTitle>
            <DialogDescription>
              {t(
                'They get an offer for {code} and have {minutes} minutes to accept. Accepting reserves their printer and starts production. The buyer never sees who the maker is.',
                { code: order.code, minutes: offerTtlMinutes }
              )}
            </DialogDescription>
          </DialogHeader>
          {picked && picked.missing.length > 0 && (
            <div className="rounded-md border border-line bg-amber-soft px-4 py-3 text-sm text-amber-ink">
              <p className="font-medium">
                {t('This maker does not meet these rules. Send the offer anyway?')}
              </p>
              <ul className="mt-2 list-inside list-disc">
                {picked.missing.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
              <p className="mt-2">
                {t('If they accept, production starts even without free capacity on file.')}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPicked(null)}>
              {t('Cancel')}
            </Button>
            <Button onClick={send} disabled={sending}>
              {sending
                ? t('Sending…')
                : picked?.missing.length
                  ? t('Send offer anyway')
                  : t('Send offer')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

AdminMatchingShow.layout = 'dashboard'
AdminMatchingShow.dashboardProps = { navItems: adminNav, title: 'Admin' }
