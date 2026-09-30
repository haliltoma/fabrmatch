import type { ReactNode } from 'react'
import { Link } from '@adonisjs/inertia/react'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight, CircleCheck, Gavel, Lock, Wallet } from 'lucide-react'
import { formatDate } from '~/lib/format'
import { useT } from '~/lib/i18n'
import { ORDER_STAGES, orderNextStep, type Actor, type MoneyState } from '~/lib/order_next_step'

const ACTORS: Record<Actor, string> = {
  you: 'You',
  fabrmatch: 'Fabrmatch',
  maker: 'The maker',
  carrier: 'The carrier',
}

const MONEY: Record<
  Exclude<MoneyState, 'none'>,
  { icon: typeof Lock; label: string; tone: string }
> = {
  not_paid: { icon: Wallet, label: 'Not paid yet', tone: 'bg-ink-100 text-ink-800' },
  held: { icon: Lock, label: 'Money held by Fabrmatch', tone: 'bg-ink-100 text-ink-800' },
  released: { icon: CircleCheck, label: 'Paid to the maker', tone: 'bg-fil-100 text-fil-700' },
  decided: { icon: Gavel, label: 'Settled by the decision', tone: 'bg-ink-100 text-ink-800' },
}

/**
 * The order page's "what happens next" card: where the order is on the six-stage track, whose move
 * it is, where the money is, and the buyer's actions (passed in as children). A finished order
 * suggests the next thing to do instead of ending on a dead end.
 */
export function OrderNextStep({
  status,
  confirmDays,
  deliveredAt,
  children,
}: {
  status: string
  confirmDays: number
  deliveredAt: string | null
  children?: ReactNode
}) {
  const { t } = useT()
  const still = useReducedMotion() ?? false
  const step = orderNextStep(status, { confirmDays, deliveredAt, formatDate })
  const current = step.stage ? ORDER_STAGES.findIndex((s) => s.id === step.stage) : -1
  const finished = step.stage === 'done'
  const money = step.money === 'none' ? null : MONEY[step.money]

  return (
    <section
      aria-labelledby="next-step-title"
      className="rounded-[10px] border-2 border-ink-900 bg-paper-raised"
    >
      {current >= 0 && (
        <div className="border-b-2 border-ink-900 px-5 pt-4 pb-3">
          <ol className="grid grid-cols-6 gap-1.5" aria-label={t('Order progress')}>
            {ORDER_STAGES.map((s, i) => {
              const done = i < current || (finished && i === current)
              const now = i === current && !finished
              return (
                <li key={s.id} aria-current={now ? 'step' : undefined}>
                  <div className="relative h-1.5 overflow-hidden rounded-full bg-ink-100">
                    {(done || now) && (
                      <motion.div
                        className={`absolute inset-0 origin-left ${now ? 'bg-heat-500' : 'bg-ink-900'}`}
                        initial={still ? false : { scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.3, ease: 'easeOut', delay: still ? 0 : i * 0.08 }}
                      />
                    )}
                  </div>
                  <p
                    className={`mt-1.5 hidden text-xs sm:block ${
                      now ? 'font-semibold text-ink-900' : done ? 'text-ink-700' : 'text-ink-500'
                    }`}
                  >
                    {t(s.label)}
                    {done && <span className="sr-only"> ({t('done')})</span>}
                  </p>
                </li>
              )
            })}
          </ol>
          <p className="mt-2 text-xs text-ink-600 sm:hidden">
            {t('Step {n} of {total}: {label}', {
              n: current + 1,
              total: ORDER_STAGES.length,
              label: t(ORDER_STAGES[current].label),
            })}
          </p>
        </div>
      )}

      <div className="space-y-4 px-5 py-5">
        <div className="flex flex-wrap items-center gap-2">
          {step.yourTurn ? (
            <span className="rounded-full border-2 border-ink-900 bg-lime px-2.5 py-0.5 text-xs font-semibold text-ink-900">
              {t('Your turn')}
            </span>
          ) : step.actor ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-0.5 text-xs font-semibold text-ink-700">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-heat-500" />
              {t('Waiting on: {who}', { who: t(ACTORS[step.actor]) })}
            </span>
          ) : null}
          {money && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${money.tone}`}
            >
              <money.icon className="h-3.5 w-3.5" aria-hidden />
              {t(money.label)}
            </span>
          )}
        </div>

        <div>
          <h2 id="next-step-title" className="font-display text-2xl font-semibold text-ink-900">
            {t(step.title)}
          </h2>
          <p className="mt-1 max-w-xl text-ink-700">{t(step.detail, step.params)}</p>
        </div>

        {children}

        {step.suggestions.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-4">
            <span className="text-sm text-ink-600">{t('What next?')}</span>
            {step.suggestions.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="inline-flex items-center gap-1 text-sm font-semibold text-ink-900 underline underline-offset-4"
              >
                {t(s.label)} <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
