import type { ComponentType, ReactNode } from 'react'

/** No panel page ends in a bare "No X yet": say what this is and offer the next step. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: ComponentType<{ 'className'?: string; 'aria-hidden'?: boolean }>
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="layer-lines flex flex-col items-center gap-4 rounded-lg border border-dashed border-ink-900/25 px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-ink-900 text-paper">
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <div className="space-y-1">
        <h2 className="font-display text-xl font-semibold text-ink-900">{title}</h2>
        <p className="mx-auto max-w-md text-ink-700">{description}</p>
      </div>
      {action}
    </div>
  )
}
