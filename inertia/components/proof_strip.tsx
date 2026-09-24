import { useT } from '~/lib/i18n'

export type HomeStats = {
  makers: number | null
  technologies: number | null
  materials: number | null
  ratings: { count: number; average: number } | null
  confirmDays: number
}

/** Real counters only; below the server's thresholds the strip tells the launch story instead of a small number. */
export function ProofStrip({ stats }: { stats: HomeStats }) {
  const { t } = useT()
  const items: Array<{ figure: string; label: string }> = []

  if (stats.makers !== null) {
    items.push({
      figure: String(stats.makers),
      label: stats.makers === 1 ? t('verified maker') : t('verified makers'),
    })
  } else {
    items.push({ figure: t('İstanbul first'), label: t('We open city by city') })
  }
  if (stats.materials !== null) {
    items.push({ figure: String(stats.materials), label: t('print materials to choose from') })
  }
  if (stats.technologies !== null) {
    items.push({
      figure: String(stats.technologies),
      label: stats.technologies === 1 ? t('print technology') : t('print technologies'),
    })
  }
  if (stats.ratings !== null) {
    items.push({
      figure: `${stats.ratings.average.toFixed(1)} / 5`,
      label: t('average of {count} buyer ratings', { count: stats.ratings.count }),
    })
  }
  items.push({
    figure: t('{days} days', { days: stats.confirmDays }),
    label: t('to confirm delivery before the maker is paid'),
  })

  return (
    <section
      aria-label={t('Fabrmatch at a glance')}
      className="border-b border-line bg-paper-raised"
    >
      <ul className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-6 px-4 py-8 sm:px-6 md:grid-cols-[repeat(auto-fit,minmax(0,1fr))] lg:px-8">
        {items.slice(0, 4).map((item) => (
          <li key={item.label}>
            <p className="font-display text-3xl font-semibold tabular-nums text-ink-900">
              {item.figure}
            </p>
            <p className="mt-1 text-sm text-ink-700">{item.label}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
