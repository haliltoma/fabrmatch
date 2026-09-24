import type { ReactNode } from 'react'

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
    <div className="rounded-lg border border-line bg-paper-raised p-5">
      <p className="text-sm font-medium text-ink-600">{label}</p>
      <p
        className={`tabular mt-2 font-display text-4xl font-semibold ${
          tone === 'heat' ? 'text-heat-700' : tone === 'alert' ? 'text-danger' : 'text-ink-900'
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-sm text-ink-600">{hint}</p>}
    </div>
  )
}
