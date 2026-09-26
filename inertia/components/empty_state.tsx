import type { ComponentType, ReactNode } from 'react'

const FACES = ['bg-sun', 'bg-lime', 'bg-sky', 'bg-blush']

/** Same title, same colour: a stable pick so the page does not change between renders. */
const faceFor = (title: string) =>
  FACES[[...title].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % FACES.length]

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
      <span
        className={`flex h-14 w-14 items-center justify-center rounded-lg border-2 border-ink-900 text-ink-900 shadow-[3px_3px_0_#15181c] ${faceFor(title)}`}
      >
        <Icon className="h-7 w-7" aria-hidden />
      </span>
      <div className="space-y-1">
        <h2 className="font-display text-xl font-semibold text-ink-900">{title}</h2>
        <p className="mx-auto max-w-md text-ink-700">{description}</p>
      </div>
      {action}
    </div>
  )
}
