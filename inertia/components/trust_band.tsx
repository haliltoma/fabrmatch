import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { useRevealed } from '~/lib/use_revealed'
import {
  ArrowUp,
  Camera,
  Check,
  EyeOff,
  KeyRound,
  Lock,
  MessageSquareLock,
  ScanLine,
  UserCheck,
  type LucideIcon,
} from 'lucide-react'
import { useT } from '~/lib/i18n'

interface Stop {
  icon: LucideIcon
  title: string
  text: string
}

/**
 * The path of a buyer's model file. Each line is enforced in code: `scanUpload` (file_scanner.ts),
 * render-only shop images (rule 4), `file_access_service` grants (tier 0: 24 h, 2 downloads) and the
 * photo that fulfillment requires before a job can ship (fulfillment_service.ts).
 */
const STOPS: Stop[] = [
  {
    icon: ScanLine,
    title: 'Scanned on upload',
    text: 'Before anyone opens it, the file is checked for:',
  },
  {
    icon: Lock,
    title: 'Kept out of sight',
    text: 'Stored privately. The shop only ever shows a rendered picture, never the file.',
  },
  {
    icon: KeyRound,
    title: 'One maker, one key',
    text: 'Only the maker who accepted the job gets a download link, and it expires.',
  },
  {
    icon: Camera,
    title: 'Photographed before it ships',
    text: 'The maker has to photograph the finished part. The photos are kept as evidence if you open a dispute.',
  },
]

/** The static checks every upload passes (docs/SECURITY.md, "Model dosyası güvenliği"). */
const CHECKS = [
  'Program files and known malware signatures',
  'Hidden scripts inside the model',
  'Broken or oversized geometry',
  'Zip bombs in 3MF archives',
  'Anything changed after upload',
]

const PEOPLE: Array<{ icon: LucideIcon; text: string }> = [
  { icon: UserCheck, text: 'Every maker is checked once by our team before their first offer.' },
  {
    icon: EyeOff,
    text: 'You never learn who printed your part, and the maker sees only what goes on the shipping label.',
  },
  {
    icon: MessageSquareLock,
    text: 'Phone numbers, links and e-mail addresses are hidden in messages; photos lose their location data.',
  },
]

const STEP_SECONDS = 2.4

/**
 * "Your model stays yours": what protects a file and a person on the way to a stranger's printer.
 * Money is covered by "After you pay" just above, so this band only links back to it. While on
 * screen the highlight walks the four stops; reduced motion shows every stop at rest.
 */
export function TrustBand() {
  const { t } = useT()
  const still = useReducedMotion() ?? false
  const ref = useRef<HTMLOListElement>(null)
  const inView = useInView(ref, { margin: '-100px' })
  const seen = useRevealed(ref)
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (still || !inView) return
    const timer = setTimeout(() => setActive((i) => (i + 1) % STOPS.length), STEP_SECONDS * 1000)
    return () => clearTimeout(timer)
  }, [still, inView, active])

  return (
    <section
      aria-labelledby="trust-title"
      className="palette-light layer-lines-light bg-ink-900 text-paper"
    >
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-3">
          <div>
            <p className="font-mono text-xs font-semibold tracking-widest text-ink-300 uppercase">
              {t('Behind every order')}
            </p>
            <h2
              id="trust-title"
              className="mt-3 max-w-2xl font-display text-4xl leading-[1.05] font-semibold tracking-tight sm:text-5xl"
            >
              {t('Your model stays yours. Nobody sees more than they need.')}
            </h2>
          </div>
          <p className="max-w-sm text-lg text-ink-200">
            {t('What happens to your file on its way to a stranger’s printer.')}
          </p>
        </div>

        <ol
          ref={ref}
          className="mt-12 grid gap-4 lg:grid-cols-4"
          aria-label={t('Your file’s path')}
        >
          {STOPS.map((stop, i) => {
            const on = still || i === active
            return (
              <li
                key={stop.title}
                className={`relative rounded-[10px] border-2 p-5 transition-colors duration-300 ${
                  on ? 'border-lime bg-ink-800' : 'border-ink-700 bg-ink-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`grid h-10 w-10 place-items-center rounded-md border-2 transition-colors duration-300 ${
                      on ? 'border-lime bg-lime text-ink-900' : 'border-ink-600 text-paper'
                    }`}
                  >
                    <stop.icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  </span>
                  <span className="font-mono text-xs text-ink-300">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="mt-4 font-display text-lg leading-snug font-semibold">
                  {t(stop.title)}
                </h3>
                <p className="mt-1 text-sm text-ink-200">{t(stop.text)}</p>

                {i === 0 && (
                  <ul className="mt-3 space-y-1.5 text-sm">
                    {CHECKS.map((c, j) => (
                      <li key={c} className="flex items-start gap-2 text-ink-100">
                        <motion.span
                          className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-lime text-ink-900"
                          initial={still ? false : { scale: 0, opacity: 0 }}
                          animate={seen || still ? { scale: 1, opacity: 1 } : undefined}
                          transition={{
                            duration: 0.2,
                            ease: 'easeOut',
                            delay: still ? 0 : 0.3 + j * 0.25,
                          }}
                        >
                          <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                        </motion.span>
                        {t(c)}
                      </li>
                    ))}
                  </ul>
                )}
                {i === 2 && (
                  <p className="mt-3 inline-flex items-center gap-2 rounded-md border border-ink-600 px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-ink-100">
                    <KeyRound className="h-3.5 w-3.5" aria-hidden />
                    {t('New maker: 24 h · 2 downloads')}
                  </p>
                )}
              </li>
            )
          })}
        </ol>

        <ul className="mt-12 grid gap-6 border-t border-ink-700 pt-8 md:grid-cols-3">
          {PEOPLE.map((p) => (
            <li key={p.text} className="flex gap-3 text-ink-100">
              <p.icon
                className="mt-0.5 h-5 w-5 shrink-0 text-lime"
                strokeWidth={1.75}
                aria-hidden
              />
              <span>{t(p.text)}</span>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-sm">
          <a
            href="#after-you-pay"
            className="inline-flex items-center gap-1 font-semibold text-paper underline underline-offset-4"
          >
            {t('How your money is protected')} <ArrowUp className="h-4 w-4" aria-hidden />
          </a>
        </p>
      </div>
    </section>
  )
}
