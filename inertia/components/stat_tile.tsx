import type { ReactNode } from 'react'
import { CountUp } from '~/components/count_up'

/** One real number with its context. Never a hard-coded placeholder. */
export function StatTile({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string
  value: ReactNode
  hint?: string
  tone?: 'default' | 'heat' | 'alert'
}) {
  return (
    <div
      className={`rounded-lg border border-line border-t-4 bg-paper-raised p-5 ${
        tone === 'heat'
          ? 'border-t-heat-500'
          : tone === 'alert'
            ? 'border-t-danger'
            : 'border-t-lime'
      }`}
    >
      <p className="text-sm font-medium text-ink-600">{label}</p>
      <p
        className={`tabular mt-2 font-display text-3xl font-semibold 2xl:text-4xl ${
          tone === 'heat' ? 'text-heat-700' : tone === 'alert' ? 'text-danger' : 'text-ink-900'
        }`}
      >
        {typeof value === 'number' ? <CountUp value={value} /> : value}
      </p>
      {hint && <p className="mt-1 text-sm text-ink-600">{hint}</p>}
    </div>
  )
}
