import { Monitor, Moon, Sun } from 'lucide-react'
import { useT } from '~/lib/i18n'
import { useTheme, type ThemePref } from '~/lib/theme'

const OPTIONS: Array<{ value: ThemePref; label: string; icon: typeof Sun }> = [
  { value: 'light', label: 'Light theme', icon: Sun },
  { value: 'dark', label: 'Dark theme', icon: Moon },
  { value: 'system', label: 'Use system theme', icon: Monitor },
]

/** Light · dark · system, as a small segmented control. */
export function ThemeSwitch({ tone = 'ink' }: { tone?: 'ink' | 'paper' }) {
  const { t } = useT()
  const { pref, choose } = useTheme()
  return (
    <div role="group" aria-label={t('Theme')} className="flex items-center gap-0.5">
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = pref === value
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            aria-label={t(label)}
            title={t(label)}
            onClick={() => choose(value)}
            className={`flex h-8 w-8 items-center justify-center rounded ${
              tone === 'paper'
                ? active
                  ? 'bg-paper text-ink-900'
                  : 'text-sidebar-muted hover:text-sidebar-fg'
                : active
                  ? 'bg-ink-900 text-paper'
                  : 'text-ink-700 hover:text-ink-900'
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </button>
        )
      })}
    </div>
  )
}
