import { formatDateTime } from '~/lib/format'
import { useT } from '~/lib/i18n'

export type StepperEntry = { status: string; at: string }

/** Order timeline drawn as printed layers: each status stacks on the previous one. */
export function LayerStepper({ entries }: { entries: StepperEntry[] }) {
  const { t } = useT()

  if (entries.length === 0) return null
  return (
    <ol aria-label={t('Order history')} className="flex flex-col-reverse gap-1">
      {entries.map((entry, index) => {
        const current = index === entries.length - 1
        return (
          <li
            key={`${entry.status}-${entry.at}`}
            className={`flex items-center justify-between gap-3 rounded-sm px-3 py-2 text-sm ${
              current ? 'bg-heat-500 font-semibold text-ink-900' : 'bg-ink-900 text-paper'
            }`}
            style={{
              marginLeft: `${Math.min(index, 6) * 2}px`,
              marginRight: `${Math.min(index, 6) * 2}px`,
            }}
          >
            <span className="capitalize">{t(entry.status.replaceAll('_', ' '))}</span>
            <time
              className={`tabular text-xs ${current ? 'text-ink-900' : 'text-ink-300'}`}
              dateTime={entry.at}
            >
              {formatDateTime(entry.at)}
            </time>
          </li>
        )
      })}
    </ol>
  )
}
