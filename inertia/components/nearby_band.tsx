import { Link } from '@adonisjs/inertia/react'
import { ArrowRight } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { useT } from '~/lib/i18n'

/** Abstract "nearest maker" diagram: not a map, so it claims no coverage we do not have. */
function NearbyDiagram() {
  const makers = [
    [92, 74],
    [212, 58],
    [246, 150],
    [70, 168],
  ]
  return (
    <svg viewBox="0 0 320 220" className="w-full max-w-md" aria-hidden focusable="false">
      {[28, 62, 96].map((r) => (
        <circle
          key={r}
          cx="160"
          cy="110"
          r={r}
          fill="none"
          stroke="#15181c"
          strokeOpacity="0.45"
          strokeDasharray="3 5"
        />
      ))}
      {makers.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <line x1="160" y1="110" x2={x} y2={y} stroke="#2f7d5b" strokeOpacity="0.5" />
          <circle cx={x} cy={y} r="8" fill="#2f7d5b" />
          <circle cx={x} cy={y} r="3" fill="#dcefe5" />
        </g>
      ))}
      <circle cx="160" cy="110" r="10" fill="#15181c" />
    </svg>
  )
}

export function NearbyBand({ makers }: { makers: number | null }) {
  const { t } = useT()
  return (
    <section className="border-y-2 border-ink-900 bg-sky">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1.1fr_1fr] lg:px-8">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-900">
            {t('We open city by city')}
          </p>
          <h2 className="mt-3 max-w-lg font-display text-4xl font-semibold leading-tight text-ink-900">
            {t('Printed near you, not across the world.')}
          </h2>
          <p className="mt-4 max-w-lg text-ink-900">
            {t(
              'A nearby maker prints your order, so shipping stays short. We start in İstanbul with FDM printing and open more cities as makers join.'
            )}
          </p>
          {makers !== null && (
            <p className="mt-3 font-mono text-sm text-ink-800">
              {makers === 1
                ? t('{count} verified maker so far', { count: makers })
                : t('{count} verified makers so far', { count: makers })}
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/for-makers">
                {t('Tell us where your printer is')} <ArrowRight />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/for-sellers">{t('Join the seller list')}</Link>
            </Button>
          </div>
        </div>
        <div className="flex justify-center">
          <NearbyDiagram />
        </div>
      </div>
    </section>
  )
}
