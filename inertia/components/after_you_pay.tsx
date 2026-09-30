import { useRef } from 'react'
import { Link } from '@adonisjs/inertia/react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import {
  ArrowRight,
  BadgeCheck,
  CreditCard,
  Lock,
  LockOpen,
  PackageCheck,
  Printer,
  ShieldCheck,
  Truck,
  UserCheck,
  type LucideIcon,
} from 'lucide-react'
import { useT } from '~/lib/i18n'

interface Step {
  icon: LucideIcon
  title: string
  text: string
  /** A real fallback in the order state machine for when this step goes wrong. */
  net?: { when: string; then: string }
}

/**
 * The order's path after payment, with what happens to the money at each step. Every line is
 * backed by the state machine: cancel with refund until a maker accepts (paid/matching/unmatched →
 * cancelled), rematching when a maker drops out (in_production → matching), disputes that end in a
 * refund or a reprint (disputed → resolved | matching), and release after confirmation.
 */
const STEPS: Step[] = [
  {
    icon: CreditCard,
    title: 'You pay',
    text: 'Fabrmatch holds the money. The maker does not get it yet.',
  },
  {
    icon: UserCheck,
    title: 'A maker takes the job',
    text: 'A verified maker with the right printer, material and free time accepts it.',
    net: {
      when: 'No maker free?',
      then: 'We tell you, and you can cancel for a full refund.',
    },
  },
  {
    icon: Printer,
    title: 'It is printed',
    text: 'We e-mail you when printing starts.',
    net: { when: 'Maker drops out?', then: 'The job goes to another maker.' },
  },
  {
    icon: Truck,
    title: 'It ships',
    text: 'The tracking number appears on your order page.',
  },
  {
    icon: PackageCheck,
    title: 'You check it',
    text: 'You have {days} days after delivery to look it over.',
    net: {
      when: 'Wrong or broken?',
      then: 'Open a dispute with photos. An admin decides: refund, partial refund or a reprint.',
    },
  },
  {
    icon: BadgeCheck,
    title: 'The maker is paid',
    text: 'Only after you confirm, or the {days} days pass without a problem.',
  },
]

/** "What happens after you pay": escrow told as a timeline, with the safety net under each risk. */
export function AfterYouPay({ confirmDays }: { confirmDays: number }) {
  const { t } = useT()
  const reduce = useReducedMotion() ?? false
  const ref = useRef<HTMLOListElement>(null)
  const seen = useInView(ref, { once: true, margin: '-100px' })
  const on = reduce || seen
  const last = STEPS.length - 1
  const stepDelay = (i: number) => (reduce ? 0 : 0.2 + i * 0.35)

  return (
    <section id="after-you-pay" aria-labelledby="after-you-pay-title" className="bg-paper">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-3">
          <div>
            <p className="font-mono text-xs font-semibold tracking-widest text-ink-600 uppercase">
              {t('After you pay')}
            </p>
            <h2
              id="after-you-pay-title"
              className="mt-3 max-w-2xl font-display text-4xl leading-[1.05] font-semibold tracking-tight text-ink-900 sm:text-5xl"
            >
              {t('Your money waits. You see every step.')}
            </h2>
          </div>
          <p className="max-w-sm text-lg text-ink-700">
            {t('What happens to your order, and to your money, from payment to your door.')}
          </p>
        </div>

        <div className="relative mt-12">
          {/* the track: vertical on phones, horizontal from lg; it fills as the steps light up */}
          <div
            aria-hidden
            className="absolute top-5 bottom-5 left-5 w-0.5 bg-line lg:top-5 lg:right-[calc((100%-100px)/6-20px)] lg:bottom-auto lg:h-0.5 lg:w-auto"
          >
            <motion.div
              className="h-full w-full origin-top bg-ink-900 lg:origin-left"
              initial={reduce ? false : { scaleY: 0, scaleX: 0 }}
              animate={on ? { scaleY: 1, scaleX: 1 } : undefined}
              transition={{ duration: reduce ? 0 : stepDelay(last), ease: 'linear', delay: 0.2 }}
            />
          </div>

          <ol
            ref={ref}
            className="relative grid gap-8 lg:grid-cols-6 lg:gap-5"
            aria-label={t('Order steps')}
          >
            {STEPS.map((step, i) => {
              const paid = i === last
              const Money = paid ? LockOpen : Lock
              return (
                <li
                  key={step.title}
                  className="relative grid grid-cols-[2.5rem_1fr] gap-4 lg:block"
                >
                  <motion.span
                    className="relative z-10 grid h-10 w-10 place-items-center rounded-full border-2 border-ink-900 bg-paper-raised text-ink-900"
                    initial={reduce ? false : { scale: 0.7, opacity: 0.4 }}
                    animate={on ? { scale: 1, opacity: 1 } : undefined}
                    transition={{ duration: 0.25, ease: 'easeOut', delay: stepDelay(i) }}
                  >
                    <step.icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  </motion.span>
                  <motion.div
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={on ? { opacity: 1, y: 0 } : undefined}
                    transition={{ duration: 0.3, ease: 'easeOut', delay: stepDelay(i) }}
                    className="lg:mt-4"
                  >
                    <p className="font-mono text-xs text-ink-600">
                      {String(i + 1).padStart(2, '0')}
                    </p>
                    <h3 className="font-display text-lg leading-snug font-semibold text-ink-900">
                      {t(step.title)}
                    </h3>
                    <p className="mt-1 text-sm text-ink-700">
                      {t(step.text, { days: confirmDays })}
                    </p>
                    <p
                      className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        paid ? 'bg-fil-100 text-fil-700' : 'bg-ink-100 text-ink-800'
                      }`}
                    >
                      <Money className="h-3.5 w-3.5" aria-hidden />
                      {paid ? t('Money released') : t('Money held')}
                    </p>
                    {step.net && (
                      <div className="mt-3 rounded-[10px] border border-dashed border-amber-ink/40 bg-amber-soft p-3 text-sm text-amber-ink">
                        <p className="flex items-center gap-1.5 font-semibold">
                          <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
                          {t(step.net.when)}
                        </p>
                        <p className="mt-1">{t(step.net.then)}</p>
                      </div>
                    )}
                  </motion.div>
                </li>
              )
            })}
          </ol>
        </div>

        <p className="mt-10 text-sm text-ink-700">
          <Link
            href="/help"
            className="inline-flex items-center gap-1 font-semibold text-ink-900 underline underline-offset-4"
          >
            {t('Questions about payment and delivery')}{' '}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </p>
      </div>
    </section>
  )
}
