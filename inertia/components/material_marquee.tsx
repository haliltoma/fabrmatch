import { PrintArt, type PrintKind } from '~/components/print_art'
import { useT } from '~/lib/i18n'

const KINDS: PrintKind[] = ['vase', 'planter', 'stand', 'clip']
const COLORS = ['#f0501e', '#2f7d8b', '#15181c', '#9db8a0']

/** A ticker of the real, active materials; it pauses on hover or focus and stands still for reduced motion. */
export function MaterialMarquee({
  materials,
}: {
  materials: Array<{ code: string; name: string }>
}) {
  const { t } = useT()
  if (materials.length === 0) return null
  const items = [...materials, ...materials, ...materials]
  return (
    <section
      aria-label={t('Materials we print')}
      className="marquee overflow-hidden border-y-2 border-ink-900 bg-lime"
    >
      <ul className="sr-only">
        {materials.map((m) => (
          <li key={m.code}>{m.name}</li>
        ))}
      </ul>
      <div aria-hidden className="marquee-track flex w-max gap-10 py-3">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 items-center gap-10">
            {items.map((m, i) => (
              <span
                key={`${m.code}-${i}`}
                className="flex items-center gap-3 font-display text-xl font-semibold text-ink-900"
              >
                <PrintArt
                  kind={KINDS[i % KINDS.length]}
                  color={COLORS[i % COLORS.length]}
                  className="h-8 w-8"
                />
                {m.name}
              </span>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
