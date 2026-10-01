import { Link } from '@adonisjs/inertia/react'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { useT } from '~/lib/i18n'

export type NextUpItem = { key: string; count: number; label: string; href: string }

/**
 * A panel's to-do list: each kind of waiting work with its count, in the order to handle it, one
 * tap to where it is done. Empty, it says so plainly instead of disappearing. Used on the admin
 * "Today" page and the maker dashboard.
 */
export function NextUp({
  title,
  items,
  empty,
}: {
  title: string
  items: NextUpItem[]
  /** what to say when nothing waits */
  empty: string
}) {
  const { t } = useT()
  return (
    <section
      aria-labelledby="next-up-h"
      className="rounded-[10px] border-2 border-ink-900 bg-paper-raised"
    >
      <div className="flex items-center justify-between gap-3 border-b-2 border-ink-900 px-5 py-3">
        <h2 id="next-up-h" className="font-display text-lg font-semibold text-ink-900">
          {title}
        </h2>
        {items.length > 0 && (
          <span className="font-mono text-xs text-ink-600 tabular-nums">
            {t('{count} kinds of work waiting', { count: items.length })}
          </span>
        )}
      </div>
      {items.length === 0 ? (
        <p className="flex items-center gap-2 px-5 py-4 text-ink-700">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-fil-600" aria-hidden />
          {empty}
        </p>
      ) : (
        <ol className="divide-y divide-line">
          {items.map((item, i) => (
            <li key={item.key}>
              <Link
                href={item.href}
                className="flex min-h-12 items-center gap-4 px-5 py-3 transition-colors hover:bg-paper-sunken focus-visible:bg-paper-sunken"
              >
                <span className="hidden w-6 font-mono text-xs text-ink-500 tabular-nums sm:inline">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="min-w-10 rounded-full bg-heat-100 px-2 text-center font-mono text-sm font-semibold text-heat-700 tabular-nums">
                  {item.count}
                </span>
                <span className="flex-1 font-medium text-ink-900">{t(item.label)}</span>
                <ArrowRight className="h-4 w-4 text-ink-500" aria-hidden />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
