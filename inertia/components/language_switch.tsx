import { router } from '@inertiajs/react'
import { useT } from '~/lib/i18n'

/** EN | TR toggle; the choice is stored in a cookie and applies to the next render. */
export function LanguageSwitch({ tone = 'ink' }: { tone?: 'ink' | 'paper' }) {
  const { locale, t } = useT()
  return (
    <div role="group" aria-label={t('Language')} className="flex items-center gap-1 text-sm">
      {(['en', 'tr'] as const).map((code) => (
        <button
          key={code}
          type="button"
          aria-pressed={locale === code}
          onClick={() =>
            locale !== code && router.post('/language', { lang: code }, { preserveScroll: true })
          }
          className={`rounded px-1.5 py-0.5 font-mono text-xs uppercase ${
            tone === 'paper'
              ? locale === code
                ? 'bg-paper text-ink-900'
                : 'text-sidebar-muted hover:text-sidebar-fg'
              : locale === code
                ? 'bg-ink-900 text-paper'
                : 'text-ink-700 hover:text-ink-900'
          }`}
        >
          {code}
        </button>
      ))}
    </div>
  )
}
