import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Link } from '@adonisjs/inertia/react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { useT } from '~/lib/i18n'
import {
  BED_Y,
  CYCLE_SECONDS,
  PARK,
  TOP_Y,
  headKeyframes,
  revealKeyframes,
} from '~/lib/showcase_timeline'

/** Black inside a mask cuts a hole (screw holes, windows) through the printed part. */
const HOLE = '#000'

function gearPath() {
  const cx = 60
  const cy = 64
  const points: string[] = []
  for (let k = 0; k < 10; k++) {
    const c = k * 36
    for (const [r, a] of [
      [32, c - 12],
      [44, c - 6],
      [44, c + 6],
      [32, c + 12],
    ] as const) {
      const rad = (a * Math.PI) / 180
      points.push(`${(cx + r * Math.cos(rad)).toFixed(1)} ${(cy + r * Math.sin(rad)).toFixed(1)}`)
    }
  }
  return `M${points.join('L')}Z M72 64A12 12 0 1 0 48 64A12 12 0 1 0 72 64Z`
}

/** Printed-part silhouettes on a 120 × 120 grid, each standing on y = 110 (the bed). */
const SHAPES = {
  vase: (
    <path d="M42 14H78C78 32 93 44 93 66C93 92 83 108 75 110H45C37 108 27 92 27 66C27 44 42 32 42 14Z" />
  ),
  planter: (
    <>
      <path d="M24 48H96L88 110H32Z" />
      <path d="M20 36H100V50H20Z" />
      <ellipse cx="46" cy="22" rx="8" ry="15" transform="rotate(-24 46 22)" />
      <ellipse cx="74" cy="22" rx="8" ry="15" transform="rotate(24 74 22)" />
      <ellipse cx="60" cy="16" rx="7" ry="15" />
    </>
  ),
  gear: <path fillRule="evenodd" d={gearPath()} />,
  enclosure: (
    <>
      <path d="M22 52H98V110H22Z" />
      <path d="M16 40H104V54H16Z" />
      <rect x="30" y="64" width="22" height="9" rx="2" fill={HOLE} />
      <circle cx="26" cy="47" r="3" fill={HOLE} />
      <circle cx="94" cy="47" r="3" fill={HOLE} />
      <path d="M62 82H90V86H62ZM62 92H90V96H62Z" fill={HOLE} />
    </>
  ),
  organizer: (
    <>
      <path d="M18 56Q18 52 22 52H44Q48 52 48 56V110H18Z" />
      <path d="M50 30Q50 26 54 26H72Q76 26 76 30V110H50Z" />
      <path d="M78 70Q78 66 82 66H100Q104 66 104 70V110H78Z" />
    </>
  ),
  stand: <path d="M12 110H108V96H12ZM46 96L62 30H82L74 96ZM12 96H34V80H12Z" />,
  knight: (
    <>
      <path d="M28 110H92V98H28ZM36 98H84V90H36Z" />
      <path d="M42 90C44 76 52 68 48 58C42 56 32 60 26 54L38 34C44 24 54 16 66 16C84 18 94 38 90 62C88 76 80 84 80 90Z" />
      <circle cx="58" cy="34" r="3.5" fill={HOLE} />
    </>
  ),
  clip: (
    <path
      d="M90 44A34 34 0 1 0 90 92"
      fill="none"
      stroke="#fff"
      strokeWidth="15"
      strokeLinecap="round"
    />
  ),
  rocket: (
    <>
      <path d="M60 10C77 24 81 46 79 86H41C39 46 43 24 60 10Z" />
      <path d="M42 62L24 94V110L42 94ZM78 62L96 94V110L78 94Z" />
      <path d="M48 86H72L68 100H52Z" />
      <circle cx="60" cy="44" r="9" fill={HOLE} />
    </>
  ),
  lamp: (
    <>
      <path d="M38 16H82L100 70H20Z" />
      <path d="M56 70H64V100H56ZM32 100H88V110H32Z" />
      <circle cx="46" cy="38" r="4" fill={HOLE} />
      <circle cx="60" cy="30" r="3" fill={HOLE} />
      <circle cx="72" cy="42" r="5" fill={HOLE} />
      <circle cx="56" cy="52" r="4" fill={HOLE} />
      <circle cx="82" cy="58" r="3" fill={HOLE} />
      <circle cx="38" cy="58" r="3" fill={HOLE} />
    </>
  ),
} satisfies Record<string, ReactNode>

type ShapeKind = keyof typeof SHAPES

interface Category {
  kind: ShapeKind
  name: string
  examples: string
  color: string
  /** Where this kind of job is explained with real prices, when such a page exists. */
  useCase?: string
}

/** Illustration colours only (the filament spool palette, DESIGN.md §13.1); one orange part. */
const CATEGORIES: Category[] = [
  { kind: 'vase', name: 'Home & decor', examples: 'Vases, bowls, wall art', color: '#2f7d8b' },
  {
    kind: 'gear',
    name: 'Spare parts',
    examples: 'Gears, knobs, brackets, clips',
    color: '#23282e',
    useCase: 'spare-parts',
  },
  {
    kind: 'planter',
    name: 'Plant pots',
    examples: 'Planters, self-watering pots',
    color: '#e7a79a',
  },
  {
    kind: 'enclosure',
    name: 'Prototypes',
    examples: 'Enclosures, fit checks, jigs',
    color: '#9db8a0',
    useCase: 'prototype',
  },
  {
    kind: 'knight',
    name: 'Tabletop games',
    examples: 'Miniatures, chess sets, dice towers',
    color: '#d9a420',
  },
  {
    kind: 'organizer',
    name: 'Desk & storage',
    examples: 'Pen cups, drawer dividers',
    color: '#2f7d8b',
  },
  { kind: 'rocket', name: 'Toys & gifts', examples: 'Gifts, puzzles, name tags', color: '#f0501e' },
  {
    kind: 'clip',
    name: 'Cable management',
    examples: 'Clips and hooks, by the hundred',
    color: '#23282e',
    useCase: 'small-batch',
  },
  { kind: 'lamp', name: 'Lighting', examples: 'Lamp shades, diffusers', color: '#d9a420' },
  {
    kind: 'stand',
    name: 'Gadget stands',
    examples: 'Phone, tablet and headphone stands',
    color: '#9db8a0',
  },
]

/** A printed part with layer lines that follow its outline. */
function Part({ kind, color, id }: { kind: ShapeKind; color: string; id: string }) {
  return (
    <>
      <defs>
        <pattern id={`${id}-l`} width="4" height="3.2" patternUnits="userSpaceOnUse">
          <rect width="4" height="1" fill="#15181c" fillOpacity="0.18" />
        </pattern>
        <mask id={`${id}-m`}>
          <g fill="#fff">{SHAPES[kind]}</g>
        </mask>
      </defs>
      <g mask={`url(#${id}-m)`}>
        <rect width="120" height="120" fill={color} />
        <rect width="120" height="120" fill={`url(#${id}-l)`} />
      </g>
    </>
  )
}

function PartIcon({
  kind,
  color,
  className,
}: {
  kind: ShapeKind
  color: string
  className?: string
}) {
  const id = useId()
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden focusable="false">
      <Part kind={kind} color={color} id={id} />
    </svg>
  )
}

const HEAD = headKeyframes()
const REVEAL = revealKeyframes()
const INK = '#23282e'

/** The printer: a gantry and head that build the current part layer by layer on a heated bed. */
function Printer({ category, run, cycle }: { category: Category; run: boolean; cycle: number }) {
  const id = useId()
  const transition = { duration: CYCLE_SECONDS, times: HEAD.times, ease: 'linear' as const }
  const head = run ? { x: HEAD.x, y: HEAD.y } : { x: PARK.x, y: PARK.y }
  return (
    <svg viewBox="0 0 240 210" className="h-auto w-full" aria-hidden focusable="false">
      {/* frame */}
      <rect x="14" y="12" width="8" height="186" rx="2" fill={INK} />
      <rect x="218" y="12" width="8" height="186" rx="2" fill={INK} />
      <rect x="14" y="8" width="212" height="8" rx="2" fill={INK} />
      <rect x="10" y="194" width="220" height="8" rx="2" fill={INK} />
      {/* filament spool, in the colour being printed */}
      <motion.circle
        cx="42"
        cy="36"
        r="14"
        stroke={INK}
        strokeWidth="3"
        animate={{ fill: category.color }}
        transition={{ duration: 0.3 }}
      />
      <circle cx="42" cy="36" r="4" fill="#f5f2ec" stroke={INK} strokeWidth="2" />
      {/* bed */}
      <rect x="48" y={BED_Y} width="144" height="7" rx="2" fill={INK} />
      <rect x="72" y={BED_Y + 7} width="8" height="13" fill={INK} />
      <rect x="160" y={BED_Y + 7} width="8" height="13" fill={INK} />

      <AnimatePresence initial={false}>
        <motion.g
          key={cycle}
          exit={{ opacity: 0, x: 40 }}
          transition={{ duration: 0.45, ease: 'easeIn' }}
        >
          <defs>
            <clipPath id={`${id}-r${cycle}`}>
              {run ? (
                <motion.rect
                  x="0"
                  width="240"
                  height="210"
                  initial={{ y: BED_Y }}
                  animate={{ y: REVEAL.y }}
                  transition={{ duration: CYCLE_SECONDS, times: REVEAL.times, ease: 'linear' }}
                />
              ) : (
                <rect x="0" y={TOP_Y - 10} width="240" height="210" />
              )}
            </clipPath>
          </defs>
          <g clipPath={`url(#${id}-r${cycle})`}>
            <g transform={`translate(60 ${BED_Y - 110})`}>
              <Part kind={category.kind} color={category.color} id={`${id}-p${cycle}`} />
            </g>
          </g>
        </motion.g>
      </AnimatePresence>

      {/* gantry bar rides with the head's height; the head slides along it */}
      <motion.g
        key={`gantry-${cycle}`}
        initial={run ? { y: BED_Y } : false}
        animate={{ y: head.y }}
        transition={run ? transition : { duration: 0 }}
      >
        <rect x="18" y="-26" width="204" height="6" rx="2" fill={INK} />
      </motion.g>
      <motion.g
        key={`head-${cycle}`}
        initial={run ? { x: HEAD.x[0], y: BED_Y } : false}
        animate={head}
        transition={run ? transition : { duration: 0 }}
      >
        <rect x="-15" y="-30" width="30" height="20" rx="3" fill={INK} />
        <rect x="-9" y="-25" width="18" height="4" rx="1" fill="#c8f53c" />
        <path d="M-6 -10H6L2 -2H-2Z" fill="#8a929a" stroke={INK} strokeWidth="1.5" />
        <circle cx="0" cy="-1" r="1.6" fill="#f0501e" />
      </motion.g>
    </svg>
  )
}

/**
 * "What you can print": a printer on a card builds one kind of part after another, and a ticker of
 * the categories runs underneath; picking one prints it next. Reduced motion shows finished parts
 * and still lets people step through them.
 */
export function PrintShowcase() {
  const { t } = useT()
  const reduce = useReducedMotion()
  const stageRef = useRef<HTMLDivElement>(null)
  const inView = useInView(stageRef, { margin: '-80px' })
  const [index, setIndex] = useState(0)
  const [cycle, setCycle] = useState(0)
  // The first part waits, finished, until the section is on screen; then printing starts.
  const started = useInView(stageRef, { once: true, margin: '-80px' })
  const run = !reduce
  useEffect(() => {
    if (!run || !inView || !started) return
    const timer = setTimeout(() => {
      setIndex((i) => (i + 1) % CATEGORIES.length)
      setCycle((c) => c + 1)
    }, CYCLE_SECONDS * 1000)
    return () => clearTimeout(timer)
  }, [run, inView, started, cycle])

  const pick = (i: number) => {
    setIndex(i)
    setCycle((c) => c + 1)
  }

  const current = CATEGORIES[index]
  const next = current.useCase
    ? { href: `/use-cases/${current.useCase}`, label: t('See example prices for this') }
    : { href: '/tools/quick-quote', label: t('Price your own model') }

  return (
    <section
      aria-labelledby="showcase-title"
      className="border-y-2 border-ink-900 bg-lime text-ink-900"
    >
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pt-14 pb-10 sm:px-6 lg:grid-cols-[1fr_minmax(0,30rem)] lg:gap-16 lg:px-8">
        <div>
          <p className="font-mono text-xs font-semibold tracking-widest uppercase">
            {t('What you can print')}
          </p>
          <h2
            id="showcase-title"
            className="mt-3 max-w-xl font-display text-4xl leading-[1.05] font-semibold tracking-tight sm:text-5xl"
          >
            {t('If it fits on a print bed, a maker near you can print it.')}
          </h2>
          <p className="mt-5 max-w-lg text-lg">
            {t(
              'A missing part, a gift, a prototype or a hundred of your own product. Send a 3D model, or pick a ready design from the shop.'
            )}
          </p>
          <ol className="mt-7 grid max-w-lg gap-3 text-sm sm:grid-cols-3">
            {[
              ['1', 'Bring a model or pick a design'],
              ['2', 'See the price straight away'],
              ['3', 'A verified maker prints and ships it'],
            ].map(([n, text]) => (
              <li key={n} className="flex items-start gap-2">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink-900 font-mono text-xs text-lime">
                  {n}
                </span>
                <span className="font-medium">{t(text)}</span>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button size="lg" asChild>
              <Link href="/tools/quick-quote">
                {t('See a price for your model')} <ArrowRight />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/shop">{t('Browse ready designs')}</Link>
            </Button>
          </div>
        </div>

        <div
          ref={stageRef}
          className="layer-lines rounded-[10px] border-2 border-ink-900 bg-paper-raised"
        >
          <div className="flex items-center justify-between border-b-2 border-ink-900 px-4 py-2 font-mono text-xs">
            <span className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${run && inView ? 'animate-pulse bg-heat-500' : 'bg-fil-600'}`}
                aria-hidden
              />
              {run ? t('Now printing') : t('Printed')}
            </span>
            <span className="tabular-nums">
              {String(index + 1).padStart(2, '0')} / {String(CATEGORIES.length).padStart(2, '0')}
            </span>
          </div>
          <div className="px-6 pt-4">
            <Printer category={current} run={run && started} cycle={started ? cycle + 1 : 0} />
          </div>
          <div className="min-h-[7.5rem] border-t-2 border-ink-900 px-4 py-3" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={index}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <p className="font-display text-2xl font-semibold">{t(current.name)}</p>
                <p className="text-sm text-ink-700">{t(current.examples)}</p>
                <Link
                  href={next.href}
                  className="mt-2 inline-flex items-center gap-1 text-sm font-semibold underline underline-offset-4"
                >
                  {next.label} <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Ticker: every category, right to left; hover or focus pauses it, reduced motion stops it. */}
      <div className="marquee overflow-hidden border-t-2 border-ink-900">
        <div className="marquee-track flex w-max py-3">
          {[0, 1].map((copy) => (
            <ul
              key={copy}
              className="flex shrink-0 gap-3 pr-3"
              aria-label={copy === 0 ? t('Things people print') : undefined}
              aria-hidden={copy === 1 ? true : undefined}
            >
              {CATEGORIES.map((c, i) => (
                <li key={c.kind}>
                  <button
                    type="button"
                    tabIndex={copy === 1 ? -1 : undefined}
                    onClick={() => pick(i)}
                    aria-pressed={i === index}
                    aria-label={t('Print {name}', { name: t(c.name) })}
                    className={`flex h-14 cursor-pointer items-center gap-3 rounded-[10px] border-2 border-ink-900 px-3 pr-4 font-display text-lg font-semibold whitespace-nowrap transition-transform duration-150 ease-out hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-heat-500 focus-visible:ring-offset-2 focus-visible:outline-none ${
                      i === index ? 'bg-ink-900 text-paper' : 'bg-paper-raised text-ink-900'
                    }`}
                  >
                    <PartIcon
                      kind={c.kind}
                      color={c.color}
                      className={`h-9 w-9 rounded-md ${i === index ? 'bg-paper' : ''}`}
                    />
                    {t(c.name)}
                  </button>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  )
}
