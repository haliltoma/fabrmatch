import { Link } from '@adonisjs/inertia/react'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowDown, ArrowRight, Package, Printer, Store, type LucideIcon } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { useT } from '~/lib/i18n'

interface Path {
  id: 'buyer' | 'seller' | 'maker'
  icon: LucideIcon
  tile: string
  who: string
  /** Discomfort → vision → path: the pain in their words, what changes, and the one first step. */
  pain: string
  promise: string
  /** Things this person no longer has to do; each is enforced by the product, not a hope. */
  skip: string[]
  cta: { label: string; href: string }
  /** The section further down this page that answers their next question. */
  more: { label: string; href: string }
}

const PATHS: Path[] = [
  {
    id: 'buyer',
    icon: Package,
    tile: 'bg-lime',
    who: 'I need a part printed',
    pain: 'No printer, and no idea what it should cost.',
    promise: 'See the delivered price in seconds. The part comes to your door.',
    skip: ['Owning a printer', 'An account just to see a price', 'Sending money to a stranger'],
    cta: { label: 'Get an instant price', href: '/tools/quick-quote' },
    more: { label: 'What happens after you pay', href: '#after-you-pay' },
  },
  {
    id: 'seller',
    icon: Store,
    tile: 'bg-blush',
    who: 'I want to sell 3D products',
    pain: 'Stock ties up money, and packing eats your evenings.',
    promise: 'List ready designs with your margin. Each order is printed and shipped for you.',
    skip: ['Buying stock', 'A printer of your own', 'Packing and shipping'],
    cta: { label: 'See how selling works', href: '/for-sellers' },
    more: { label: 'Work out your margin', href: '#seller-margin' },
  },
  {
    id: 'maker',
    icon: Printer,
    tile: 'bg-sky',
    who: 'I have a 3D printer',
    pain: 'It sits idle most of the week, and finding buyers is a job of its own.',
    promise: 'Get paid jobs that fit your printers, materials and free hours.',
    skip: ['Finding customers', 'Chasing payment', 'Haggling over price'],
    cta: { label: 'See how printing works', href: '/for-makers' },
    more: { label: 'Estimate your income', href: '#maker-income' },
  },
]

/** A crossed-out chore; the line draws across once the card is on screen. */
function Skipped({ text, delay, still }: { text: string; delay: number; still: boolean }) {
  const { t } = useT()
  return (
    <li className="flex items-center gap-2 text-sm text-ink-700">
      <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-ink-400" />
      <span className="relative">
        {t(text)}
        <motion.span
          aria-hidden
          className="absolute top-1/2 right-0 left-0 h-px origin-left bg-ink-500"
          initial={still ? false : { scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.35, ease: 'easeOut', delay }}
        />
      </span>
    </li>
  )
}

/**
 * "Which one are you?": three short paths instead of three copies of the order process (the hero
 * and "After you pay" already tell that). Each card says what changes for that person, what they
 * no longer need, and sends them on: one button, plus the section below that fits them.
 */
export function AudiencePaths() {
  const { t } = useT()
  const still = useReducedMotion() ?? false
  return (
    <section aria-labelledby="paths-title" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-3">
        <h2
          id="paths-title"
          className="font-display text-4xl leading-[1.05] font-semibold tracking-tight text-ink-900 sm:text-5xl"
        >
          {t('Which one are you?')}
        </h2>
        <p className="max-w-sm text-lg text-ink-700">
          {t('Three ways to use Fabrmatch. Pick yours and skip what you do not need.')}
        </p>
      </div>

      <ul className="mt-10 grid gap-5 lg:grid-cols-3">
        {PATHS.map((path, i) => (
          <motion.li
            key={path.id}
            initial={still ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.3, ease: 'easeOut', delay: still ? 0 : i * 0.08 }}
            className="flex flex-col rounded-[10px] border-2 border-b-[5px] border-ink-900 bg-paper-raised"
          >
            <div className="flex items-center gap-3 border-b-2 border-ink-900 px-5 py-4">
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-md border-2 border-ink-900 text-ink-900 ${path.tile}`}
              >
                <path.icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </span>
              <h3 className="font-display text-xl font-semibold text-ink-900">{t(path.who)}</h3>
            </div>

            <div className="flex flex-1 flex-col px-5 pt-5 pb-6">
              <p className="text-sm text-ink-600 italic">“{t(path.pain)}”</p>
              <p className="mt-3 font-display text-lg leading-snug font-semibold text-ink-900">
                {t(path.promise)}
              </p>

              <p className="mt-5 font-mono text-xs font-semibold tracking-widest text-ink-600 uppercase">
                {t('You won’t need')}
              </p>
              <ul className="mt-2 space-y-1.5" aria-label={t('You won’t need')}>
                {path.skip.map((s, j) => (
                  <Skipped key={s} text={s} still={still} delay={0.3 + i * 0.1 + j * 0.15} />
                ))}
              </ul>

              <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-3 pt-6">
                <Button variant={path.id === 'buyer' ? 'accent' : 'outline'} asChild>
                  <Link href={path.cta.href}>
                    {t(path.cta.label)} <ArrowRight />
                  </Link>
                </Button>
                <a
                  href={path.more.href}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-ink-900 underline underline-offset-4"
                >
                  {t(path.more.label)} <ArrowDown className="h-4 w-4" aria-hidden />
                </a>
              </div>
            </div>
          </motion.li>
        ))}
      </ul>
    </section>
  )
}
