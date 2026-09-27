import { useEffect, useRef, useState } from 'react'
import { Check, Lock, LockOpen } from 'lucide-react'
import { PrintJourney } from '~/components/print_journey'
import { PrintArt, type PrintKind } from '~/components/print_art'
import type { MarginSample } from '~/components/margin_band'
import {
  cursorAt,
  FACES,
  ORDER_CURSOR,
  SHOP_CURSOR,
  STORY_SECONDS,
  STORY_STILL,
  storyAt,
} from '~/lib/cube_story'
import { formatPrice } from '~/lib/format'
import { useT } from '~/lib/i18n'
import { useLoopClock } from '~/lib/use_loop_clock'

/*
 * Four-faced hero, turning left face by face: a buyer picks a design in a seller's shop, places the
 * order (payment held), the part is printed, packed and delivered, then the payment is released and
 * the seller's margin arrives. Every amount comes from the price engine (real catalog designs at a
 * 30% margin) and is marked as an example; every word goes through t().
 */
const MARGIN_BPS = 3000
const ORDER_CODE = 'FO-7K2M4Q'
const ART: Record<PrintKind, { color: string; tile: string }> = {
  vase: { color: '#f0501e', tile: 'bg-sun' },
  planter: { color: '#2f7d5b', tile: 'bg-sky' },
  stand: { color: '#15181c', tile: 'bg-blush' },
  clip: { color: '#2f7d8b', tile: 'bg-lime' },
}
const STEPS = ['Pick', 'Order', 'Print', 'Get paid']

/** Closest silhouette for a catalog title; cup-like parts (organisers, vases) draw as the vase. */
function kindFor(title: string): PrintKind {
  const s = title.toLowerCase()
  if (/plant|pot\b|saks/.test(s)) return 'planter'
  if (/stand|stant|holder/.test(s)) return 'stand'
  if (/clip|klips|hook|kanca/.test(s)) return 'clip'
  return 'vase'
}

const clamp = (v: number) => Math.min(Math.max(v, 0), 1)
const ease = (k: number) => {
  const x = clamp(k)
  return x * x * (3 - 2 * x)
}
const margin = (costMinor: number) => Math.ceil((costMinor * MARGIN_BPS) / 10_000)

function Cursor({
  travel,
  pressed,
  from,
}: {
  travel: number
  pressed: boolean
  from: [number, number]
}) {
  const k = 1 - travel
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 z-10"
      style={{
        transform: `translate(${from[0] * k}px, ${from[1] * k}px) scale(${pressed ? 0.85 : 1})`,
      }}
    >
      {pressed && (
        <span className="absolute -left-3 -top-3 h-6 w-6 animate-ping rounded-full bg-lime/70" />
      )}
      <svg width="22" height="26" viewBox="0 0 22 26" className="drop-shadow-[2px_2px_0_#15181c]">
        <path
          d="M2 2L2 21L7.5 16L11.5 24.5L15 23L11 14.5L18.5 14.5Z"
          fill="#15181c"
          stroke="#fff"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

function FaceFrame({
  step,
  title,
  children,
}: {
  step: number
  title: string
  children: React.ReactNode
}) {
  const { t } = useT()
  return (
    <div className="palette-light layer-lines flex h-full flex-col gap-2 overflow-hidden rounded-[14px] border-2 border-ink-900 bg-[#fbf7ef] p-3 sm:gap-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-display text-base font-semibold leading-tight text-ink-900 sm:text-2xl">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-ink-900 bg-lime text-xs sm:h-8 sm:w-8 sm:text-sm">
            {step}
          </span>
          {title}
        </p>
        <span className="shrink-0 rounded-full border-2 border-ink-900 bg-paper-raised px-2 py-0.5 text-xs font-semibold text-ink-900">
          {t('example')}
        </span>
      </div>
      {children}
    </div>
  )
}

function ShopFace({ items, local }: { items: MarginSample[]; local: number }) {
  const { t } = useT()
  const c = cursorAt(local, ...SHOP_CURSOR)
  return (
    <FaceFrame step={1} title={t('A buyer picks your design')}>
      <div className="grid min-h-0 flex-1 grid-cols-3 gap-2 sm:gap-4">
        {items.map((item, i) => {
          const chosen = i === 0
          const art = ART[kindFor(item.title)]
          const lift = chosen && c.hovering && !c.pressed
          return (
            <div
              key={item.id}
              style={{ transform: lift ? 'translateY(-4px)' : undefined }}
              className={`relative flex min-h-0 flex-col rounded-[12px] border-2 border-ink-900 bg-paper-raised transition-[transform,box-shadow] duration-200 ${
                lift ? 'shadow-[4px_4px_0_#15181c]' : ''
              } ${chosen && c.clicked ? 'outline outline-4 outline-offset-2 outline-lime' : ''}`}
            >
              <div
                className={`flex min-h-0 flex-1 items-center justify-center rounded-t-[10px] border-b-2 border-ink-900 ${art.tile}`}
              >
                <PrintArt kind={kindFor(item.title)} color={art.color} className="h-3/4 max-h-28" />
              </div>
              <div className="px-2 py-1.5 sm:px-3 sm:py-2">
                <p className="truncate text-xs font-semibold text-ink-900 sm:text-sm">
                  {item.title}
                </p>
                <p className="text-xs tabular-nums text-ink-700">
                  {formatPrice(item.costMinor + margin(item.costMinor), 'TRY')}
                </p>
              </div>
              {chosen && c.clicked && (
                <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink-900 bg-lime">
                  <Check className="h-4 w-4 text-ink-900" aria-hidden />
                </span>
              )}
              {chosen && <Cursor travel={c.travel} pressed={c.pressed} from={[240, 70]} />}
            </div>
          )
        })}
      </div>
      <p className="hidden text-sm text-ink-700 sm:block">
        {t('Your designs sit in your shop. You never hold stock.')}
      </p>
    </FaceFrame>
  )
}

function OrderFace({ sale, local }: { sale: MarginSample; local: number }) {
  const { t } = useT()
  const c = cursorAt(local, ...ORDER_CURSOR)
  const placed = local >= ORDER_CURSOR[2] + 0.2
  const price = sale.costMinor + margin(sale.costMinor)
  return (
    <FaceFrame step={2} title={t('They place the order')}>
      <div className="grid min-h-0 flex-1 grid-cols-[0.8fr_1.2fr] gap-3 sm:gap-4">
        <div
          className={`flex min-h-0 items-center justify-center rounded-[12px] border-2 border-ink-900 ${ART[kindFor(sale.title)].tile}`}
        >
          <PrintArt
            kind={kindFor(sale.title)}
            color={ART[kindFor(sale.title)].color}
            className="h-3/4 max-h-40"
          />
        </div>
        <div className="flex min-h-0 flex-col gap-1.5 sm:gap-2.5">
          <p className="truncate font-display text-base font-semibold text-ink-900 sm:text-2xl">
            {sale.title}
          </p>
          <div className="flex flex-wrap gap-1.5 text-xs font-semibold text-ink-900">
            <span className="rounded-full border-2 border-ink-900 bg-lime px-2 py-0.5">
              {sale.material}
            </span>
            <span className="rounded-full border-2 border-ink-900/30 px-2 py-0.5">
              {t('1 piece')}
            </span>
          </div>
          <p className="font-display text-2xl font-semibold tabular-nums text-ink-900 sm:text-4xl">
            {formatPrice(price, 'TRY')}
          </p>
          <div className="mt-auto">
            {placed ? (
              <div
                className="space-y-1 rounded-[12px] border-2 border-ink-900 bg-paper-raised p-2 sm:p-3"
                style={{ opacity: ease((local - ORDER_CURSOR[2] - 0.2) / 0.3) }}
              >
                <p className="flex items-center gap-1.5 text-sm font-semibold text-ink-900">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-fil-600">
                    <Check className="h-3.5 w-3.5 text-white" aria-hidden />
                  </span>
                  {t('Order placed')}
                  <span className="hidden font-mono text-xs text-ink-600 sm:inline">
                    {ORDER_CODE}
                  </span>
                </p>
                <p className="flex items-center gap-1.5 text-xs text-ink-700 sm:text-sm">
                  <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {t('Payment held until delivery')}
                </p>
              </div>
            ) : (
              <span
                className={`relative flex w-full items-center justify-center rounded-[10px] border-2 border-b-4 border-ink-900 bg-lime px-3 py-2 font-semibold text-ink-900 transition-transform sm:py-3 sm:text-lg ${
                  c.pressed ? 'translate-y-0.5 border-b-2' : c.hovering ? '-translate-y-0.5' : ''
                }`}
              >
                {t('Place order')}
                <Cursor travel={c.travel} pressed={c.pressed} from={[-120, -90]} />
              </span>
            )}
          </div>
        </div>
      </div>
    </FaceFrame>
  )
}

function PaidFace({ sale, local }: { sale: MarginSample; local: number }) {
  const { t } = useT()
  const earn = margin(sale.costMinor)
  const price = sale.costMinor + earn
  const released = local >= 0.9
  const split = ease((local - 1.1) / 0.8)
  const counted = Math.round(earn * ease((local - 2) / 1))
  const coin = ease((local - 1.9) / 0.5)
  return (
    <FaceFrame step={4} title={t('Delivered. You get paid.')}>
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-2 rounded-[12px] border-2 border-ink-900 bg-paper-raised p-3 sm:gap-3 sm:p-4">
        <p className="flex items-center gap-1.5 border-b-2 border-dashed border-ink-900/15 pb-2 text-sm font-semibold text-ink-900">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-fil-600">
            <Check className="h-3.5 w-3.5 text-white" aria-hidden />
          </span>
          {t('Delivered')}
          <span className="font-mono text-xs font-normal text-ink-600">{ORDER_CODE}</span>
        </p>
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="flex items-center gap-1.5 font-semibold text-ink-900">
            {released ? (
              <LockOpen className="h-4 w-4 text-fil-700" aria-hidden />
            ) : (
              <Lock className="h-4 w-4" aria-hidden />
            )}
            {released ? t('Payment released') : t('Payment held until delivery')}
          </span>
          <span className="tabular-nums text-ink-700">{formatPrice(price, 'TRY')}</span>
        </div>
        <div className="flex h-4 shrink-0 overflow-hidden rounded-full border-2 border-ink-900 bg-ink-100 sm:h-5">
          <span
            className="h-full bg-ink-900"
            style={{ width: `${(sale.costMinor / price) * 100 * split}%` }}
          />
          <span className="h-full bg-lime" style={{ width: `${(earn / price) * 100 * split}%` }} />
        </div>
        <dl className="space-y-1 text-xs sm:text-sm" style={{ opacity: split }}>
          <div className="flex items-center justify-between gap-2">
            <dt className="flex items-center gap-1.5 text-ink-700">
              <span className="h-2.5 w-2.5 rounded-sm bg-ink-900" />
              {t('Printing, delivery and fees')}
            </dt>
            <dd className="tabular-nums text-ink-900">{formatPrice(sale.costMinor, 'TRY')}</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="flex items-center gap-1.5 font-semibold text-ink-900">
              <span className="h-2.5 w-2.5 rounded-sm border border-ink-900 bg-lime" />
              {t('Your margin')}
            </dt>
            <dd className="font-semibold tabular-nums text-ink-900">{formatPrice(earn, 'TRY')}</dd>
          </div>
        </dl>
      </div>

      <div className="relative flex shrink-0 items-end justify-between gap-3 rounded-[12px] border-2 border-ink-900 bg-ink-900 px-3 py-2 text-paper sm:px-4 sm:py-3">
        <span
          aria-hidden
          className="absolute -top-5 right-6 flex h-10 w-10 items-center justify-center rounded-full border-2 border-ink-900 bg-lime font-display text-lg font-bold text-ink-900"
          style={{
            opacity: coin > 0 && coin < 1 ? 1 : 0,
            transform: `translateY(${coin * 40 - 30}px) rotate(${coin * 30}deg)`,
          }}
        >
          ₺
        </span>
        <div>
          <p className="text-xs text-ink-200 sm:text-sm">{t('Paid to you')}</p>
          <p className="font-display text-2xl font-semibold tabular-nums text-lime sm:text-4xl">
            +{formatPrice(counted, 'TRY')}
          </p>
        </div>
        <p className="hidden max-w-[13rem] text-right text-xs text-ink-200 sm:block">
          {t('No stock, no printer. Priced by our engine at a 30% margin.')}
        </p>
      </div>
    </FaceFrame>
  )
}

export function HeroCube({ samples }: { samples: MarginSample[] }) {
  const { t } = useT()
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const time = useLoopClock(ref, STORY_SECONDS, STORY_STILL, samples.length > 0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  if (samples.length === 0) return <PrintJourney />

  // the print scene makes a vase, so the buyer picks the cup-like design when there is one
  const sale = samples.find((s) => kindFor(s.title) === 'vase') ?? samples[0]
  const shelf = [sale, ...samples.filter((s) => s !== sale)].slice(0, 3)
  const story = storyAt(time)
  const half = width / 2
  const faces = [
    <ShopFace key="shop" items={shelf} local={story.local[0]} />,
    <OrderFace key="order" sale={sale} local={story.local[1]} />,
    <PrintJourney key="make" time={story.journey} />,
    <PaidFace key="paid" sale={sale} local={story.local[3]} />,
  ]

  return (
    <div>
      <div ref={ref} className="relative aspect-[640/480] w-full" style={{ perspective: '1600px' }}>
        <div
          className="absolute inset-0"
          style={{
            transformStyle: 'preserve-3d',
            transform: `translateZ(${-half}px) rotateY(${-story.turns * 90}deg)`,
          }}
        >
          {faces.map((face, i) => {
            // angle of this face away from the viewer, in (−180, 180]
            const angle = (((((i - story.turns) * 90) % 360) + 540) % 360) - 180
            const away = Math.min(Math.abs(angle) / 90, 1)
            return (
              <div
                key={FACES[i]}
                aria-hidden={i !== story.face}
                className="absolute inset-0"
                style={{
                  transform: `rotateY(${i * 90}deg) translateZ(${half}px)`,
                  backfaceVisibility: 'hidden',
                  visibility: away >= 1 ? 'hidden' : 'visible',
                }}
              >
                {face}
                <div
                  className="pointer-events-none absolute inset-0 rounded-[14px] bg-black"
                  style={{ opacity: away * 0.45 }}
                />
              </div>
            )
          })}
        </div>
      </div>
      <ol className="mt-4 grid grid-cols-4 gap-1.5 text-xs font-semibold sm:gap-2 sm:text-sm">
        {STEPS.map((label, i) => (
          <li
            key={label}
            aria-current={i === story.face ? 'step' : undefined}
            className={`flex items-center justify-center gap-1.5 rounded-full border-2 px-1.5 py-1 transition-colors sm:justify-start sm:px-3 ${
              i === story.face
                ? 'border-ink-900 bg-lime text-ink-900'
                : 'border-ink-900/20 text-ink-600'
            }`}
          >
            <span className="hidden tabular-nums sm:inline">{i + 1}</span>
            <span className="truncate">{t(label)}</span>
          </li>
        ))}
      </ol>
      <span className="sr-only">
        {t(
          'How selling works: a buyer picks a design in your shop and orders it, the payment is held, a maker prints and delivers it, then the payment is released and your margin is paid to you.'
        )}
      </span>
    </div>
  )
}
