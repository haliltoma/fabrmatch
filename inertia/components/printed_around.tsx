import { useEffect, useId, useRef, useState } from 'react'
import { Link } from '@adonisjs/inertia/react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react'
import { useRevealed } from '~/lib/use_revealed'
import { ArrowRight, Plus } from 'lucide-react'
import { Part, PartIcon, type ShapeKind } from '~/components/print_parts'
import { useT } from '~/lib/i18n'

type Next = 'shop' | 'quote' | { useCase: string }

interface Spot {
  kind: ShapeKind
  name: string
  /** The everyday problem and how a print solves it: the job, not the feature. */
  story: string
  color: string
  next: Next
  /** Where the part stands in the 1000 × 540 room: left edge, bottom (surface) and scale. */
  at: { x: number; bottom: number; s: number }
  /** The hotspot button, in room coordinates. */
  pin: { x: number; y: number }
}

/** Tour order; colours are the filament spool palette (illustration only), one orange part. */
const SPOTS: Spot[] = [
  {
    kind: 'gear',
    name: 'Spare parts',
    story:
      'A gear in the blender stripped and nobody sells it on its own. It is printed again, in tougher PETG.',
    color: '#23282e',
    next: { useCase: 'spare-parts' },
    at: { x: 771, bottom: 191, s: 0.9 },
    pin: { x: 825, y: 88 },
  },
  {
    kind: 'clip',
    name: 'Cable management',
    story: 'Cables everywhere behind the desk. A hundred clips come in one small batch.',
    color: '#2f7d8b',
    next: { useCase: 'small-batch' },
    at: { x: 918, bottom: 436, s: 0.34 },
    pin: { x: 944, y: 452 },
  },
  {
    kind: 'enclosure',
    name: 'Prototypes',
    story:
      'Your circuit needs a case before you show it to anyone. One print to hold in your hand.',
    color: '#9db8a0',
    next: { useCase: 'prototype' },
    at: { x: 500, bottom: 400, s: 0.7 },
    pin: { x: 542, y: 336 },
  },
  {
    kind: 'planter',
    name: 'Plant pots',
    story: 'A pot that fits the gap by the window to the millimetre, in the colour you want.',
    color: '#e7a79a',
    next: 'quote',
    at: { x: 70, bottom: 470, s: 1.3 },
    pin: { x: 148, y: 318 },
  },
  {
    kind: 'knight',
    name: 'Tabletop games',
    story: 'The chess piece the dog chewed, or a whole set of miniatures for game night.',
    color: '#d9a420',
    next: 'quote',
    at: { x: 555, bottom: 230, s: 0.75 },
    pin: { x: 600, y: 146 },
  },
  {
    kind: 'organizer',
    name: 'Desk & storage',
    story: 'Drawer dividers and pen cups sized to your desk, not to a catalogue.',
    color: '#2f7d8b',
    next: 'quote',
    at: { x: 395, bottom: 400, s: 0.7 },
    pin: { x: 437, y: 330 },
  },
  {
    kind: 'rocket',
    name: 'Toys & gifts',
    story: 'A gift with their name on it that nobody else has.',
    color: '#f0501e',
    next: 'shop',
    at: { x: 450, bottom: 230, s: 0.75 },
    pin: { x: 495, y: 146 },
  },
  {
    kind: 'lamp',
    name: 'Lighting',
    story: 'A lamp shade that throws a pattern on the wall when it is on.',
    color: '#d9a420',
    next: 'shop',
    at: { x: 790, bottom: 400, s: 1.05 },
    pin: { x: 853, y: 290 },
  },
  {
    kind: 'vase',
    name: 'Home & decor',
    story: 'A vase in the exact colour of your room, not the one the store happened to have.',
    color: '#2f7d8b',
    next: 'shop',
    at: { x: 345, bottom: 230, s: 0.75 },
    pin: { x: 390, y: 146 },
  },
  {
    kind: 'stand',
    name: 'Gadget stands',
    story: 'A phone stand at the angle you actually read at.',
    color: '#9db8a0',
    next: 'shop',
    at: { x: 615, bottom: 400, s: 0.8 },
    pin: { x: 690, y: 318 },
  },
]

const TOUR_SECONDS = 4
const INK = '#23282e'

/** The room: window, shelf, pegboard, desk and floor. Hex colours: this card is always light. */
function Room({ id }: { id: string }) {
  return (
    <>
      <defs>
        <pattern id={`${id}-wall`} width="8" height="6" patternUnits="userSpaceOnUse">
          <rect width="8" height="1" fill={INK} fillOpacity="0.05" />
        </pattern>
        <pattern id={`${id}-peg`} width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="10" cy="10" r="2.2" fill={INK} fillOpacity="0.28" />
        </pattern>
      </defs>
      <rect width="1000" height="540" fill="#f5f2ec" />
      <rect width="1000" height="470" fill={`url(#${id}-wall)`} />
      {/* window */}
      <rect
        x="60"
        y="50"
        width="220"
        height="200"
        rx="6"
        fill="#8fd3f4"
        stroke={INK}
        strokeWidth="5"
      />
      <path d="M170 50V250M60 150H280" stroke={INK} strokeWidth="5" />
      <circle cx="232" cy="96" r="18" fill="#ffc629" />
      <rect x="48" y="246" width="244" height="12" rx="3" fill={INK} />
      {/* shelf */}
      <rect x="330" y="230" width="330" height="12" rx="3" fill={INK} />
      <path d="M360 242V262H372ZM630 242V262H618Z" fill={INK} />
      {/* pegboard */}
      <rect
        x="700"
        y="40"
        width="250"
        height="210"
        rx="6"
        fill="#ece7de"
        stroke={INK}
        strokeWidth="5"
      />
      <rect x="703" y="43" width="244" height="204" fill={`url(#${id}-peg)`} />
      <path d="M740 196H792M740 196V214" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <path
        d="M872 190C872 172 900 172 900 190V222"
        stroke="#e7a79a"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="825" cy="146" r="5" fill={INK} />
      {/* desk */}
      <rect x="380" y="400" width="580" height="14" rx="3" fill={INK} />
      <rect x="400" y="414" width="12" height="56" fill={INK} />
      <rect x="930" y="414" width="12" height="56" fill={INK} />
      <rect
        x="720"
        y="414"
        width="190"
        height="34"
        rx="3"
        fill="#ece7de"
        stroke={INK}
        strokeWidth="4"
      />
      <rect x="798" y="428" width="34" height="5" rx="2" fill={INK} />
      {/* lamp cable, down the desk side and held by the clip */}
      <path d="M880 398C920 398 944 404 944 430V470" stroke={INK} strokeWidth="4" fill="none" />
      {/* floor */}
      <rect y="470" width="1000" height="70" fill="#ece7de" />
      <rect y="468" width="1000" height="5" fill={INK} />
    </>
  )
}

/** A part that prints itself in, bottom to top, once the room comes into view. */
function RoomPart({
  spot,
  id,
  printed,
  delay,
  active,
  still,
}: {
  spot: Spot
  id: string
  printed: boolean
  delay: number
  active: boolean
  still: boolean
}) {
  const { x, bottom, s } = spot.at
  return (
    <motion.g
      animate={{ y: active && !still ? -6 : 0, opacity: active ? 1 : 0.78 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <g transform={`translate(${x} ${bottom - 110 * s}) scale(${s})`}>
        <defs>
          <clipPath id={`${id}-c`}>
            {still ? (
              <rect width="120" height="120" />
            ) : (
              <motion.rect
                width="120"
                height="120"
                initial={{ y: 120 }}
                animate={{ y: printed ? 0 : 120 }}
                transition={{ duration: 0.9, ease: 'easeOut', delay }}
              />
            )}
          </clipPath>
        </defs>
        <g clipPath={`url(#${id}-c)`}>
          <Part kind={spot.kind} color={spot.color} id={`${id}-p`} />
          {spot.kind === 'stand' && (
            <g transform="translate(20 94) rotate(14)">
              <rect x="0" y="-80" width="40" height="80" rx="6" fill={INK} />
              <rect x="4" y="-74" width="32" height="66" rx="3" fill="#8fd3f4" />
            </g>
          )}
        </g>
      </g>
    </motion.g>
  )
}

/**
 * "What you can print", told as a room: every object in it is a printable part. People tap one to
 * see the everyday job it does and where to go next. Parts print themselves in on first view, then
 * a slow tour moves between them until someone picks one. Reduced motion: all printed, no tour.
 */
export function PrintedAround() {
  const { t } = useT()
  const id = useId()
  const reduce = useReducedMotion() ?? false
  const roomRef = useRef<HTMLDivElement>(null)
  const inView = useInView(roomRef, { margin: '-120px' })
  const printed = useRevealed(roomRef)
  const [active, setActive] = useState(0)
  const [touched, setTouched] = useState(false)

  const touring = !reduce && printed && inView && !touched
  useEffect(() => {
    if (!touring) return
    const timer = setTimeout(
      () => setActive((i) => (i + 1) % SPOTS.length),
      // the first stop waits for the parts to finish printing in
      (active === 0 ? TOUR_SECONDS + 1.6 : TOUR_SECONDS) * 1000
    )
    return () => clearTimeout(timer)
  }, [touring, active])

  const spot = SPOTS[active]
  const right = spot.pin.x > 520
  const next =
    spot.next === 'shop'
      ? { href: '/shop', label: t('Find ready designs') }
      : spot.next === 'quote'
        ? { href: '/tools/quick-quote', label: t('Price your own model') }
        : { href: `/use-cases/${spot.next.useCase}`, label: t('See example prices') }

  const pick = (i: number) => {
    setTouched(true)
    setActive(i)
  }

  return (
    <section
      aria-labelledby="around-title"
      className="border-y-2 border-ink-900 bg-lime text-ink-900"
    >
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-3">
          <div>
            <p className="font-mono text-xs font-semibold tracking-widest uppercase">
              {t('What you can print')}
            </p>
            <h2
              id="around-title"
              className="mt-3 max-w-2xl font-display text-4xl leading-[1.05] font-semibold tracking-tight sm:text-5xl"
            >
              {t('Look around. Much of it could be printed.')}
            </h2>
          </div>
          <p className="max-w-sm text-lg">
            {t('Tap an object in the room to see the everyday job it does.')}
          </p>
        </div>

        <div className="relative mt-10">
          <div
            ref={roomRef}
            className="relative overflow-hidden rounded-[10px] border-2 border-ink-900"
            style={{ aspectRatio: '1000 / 540' }}
          >
            <svg
              viewBox="0 0 1000 540"
              className="absolute inset-0 h-full w-full"
              aria-hidden
              focusable="false"
            >
              <Room id={id} />
              {SPOTS.map((s, i) => (
                <RoomPart
                  key={s.kind}
                  spot={s}
                  id={`${id}-${i}`}
                  printed={printed}
                  delay={0.15 * i}
                  active={i === active}
                  still={reduce}
                />
              ))}
            </svg>
            <ul aria-label={t('Things you can print')}>
              {SPOTS.map((s, i) => (
                <li key={s.kind}>
                  <motion.button
                    type="button"
                    onClick={() => pick(i)}
                    aria-pressed={i === active}
                    aria-controls={`${id}-detail`}
                    aria-label={t(s.name)}
                    initial={reduce ? false : { opacity: 0, scale: 0.6 }}
                    animate={printed || reduce ? { opacity: 1, scale: 1 } : undefined}
                    transition={{ duration: 0.2, delay: reduce ? 0 : 1.4 + 0.05 * i }}
                    className={`absolute hidden h-8 w-8 -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center rounded-full border-2 border-ink-900 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-heat-500 focus-visible:ring-offset-2 focus-visible:outline-none sm:grid ${
                      i === active
                        ? 'bg-ink-900 text-lime'
                        : 'bg-lime text-ink-900 hover:bg-paper-raised'
                    }`}
                    style={{ left: `${s.pin.x / 10}%`, top: `${s.pin.y / 5.4}%` }}
                  >
                    <Plus
                      className={`h-4 w-4 transition-transform duration-200 ${i === active ? 'rotate-45' : ''}`}
                      strokeWidth={2.5}
                      aria-hidden
                    />
                  </motion.button>
                </li>
              ))}
            </ul>
          </div>

          {/* Phones: the room is too small to tap, so the objects are chips under it. */}
          <ul
            className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:hidden"
            aria-label={t('Things you can print')}
          >
            {SPOTS.map((s, i) => (
              <li key={s.kind} className="shrink-0">
                <button
                  type="button"
                  onClick={() => pick(i)}
                  aria-pressed={i === active}
                  aria-controls={`${id}-detail`}
                  className={`flex h-11 cursor-pointer items-center gap-2 rounded-[10px] border-2 border-ink-900 pr-3 pl-1.5 text-sm font-semibold whitespace-nowrap focus-visible:ring-2 focus-visible:ring-heat-500 focus-visible:ring-offset-2 focus-visible:outline-none ${
                    i === active ? 'bg-ink-900 text-paper' : 'bg-paper-raised text-ink-900'
                  }`}
                >
                  <PartIcon
                    kind={s.kind}
                    color={s.color}
                    className="h-7 w-7 rounded-md bg-paper p-0.5"
                  />
                  {t(s.name)}
                </button>
              </li>
            ))}
          </ul>

          {/* Detail: under the room below lg; from lg in the empty wall across from the chosen object. */}
          <div
            id={`${id}-detail`}
            aria-live="polite"
            className={`mt-4 lg:absolute lg:top-[7%] lg:mt-0 lg:w-64 xl:w-72 ${
              right ? 'lg:left-[6%]' : 'lg:right-[5%]'
            }`}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={active}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="rounded-[10px] border-2 border-b-[5px] border-ink-900 bg-paper-raised p-4"
              >
                <p className="font-mono text-xs text-ink-600 tabular-nums">
                  {String(active + 1).padStart(2, '0')} / {String(SPOTS.length).padStart(2, '0')}
                </p>
                <p className="mt-1 font-display text-xl font-semibold">{t(spot.name)}</p>
                <p className="mt-1 text-sm text-ink-700">{t(spot.story)}</p>
                <Link
                  href={next.href}
                  className="mt-3 inline-flex items-center gap-1 text-sm font-semibold underline underline-offset-4"
                >
                  {next.label} <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}
