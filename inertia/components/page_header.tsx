import type { ReactNode } from 'react'

/** First row of every panel page: title, one-line context, optional primary action. */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-1">
        <h1 className="font-display text-3xl font-semibold text-ink-900">{title}</h1>
        {description && <p className="max-w-prose text-ink-600">{description}</p>}
      </div>
      {action}
    </header>
  )
}
