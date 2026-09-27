import { router } from '@inertiajs/react'
import { useT } from '~/lib/i18n'
import { activeMoney } from '~/lib/display_money'

/**
 * TRY | USD | EUR | GBP toggle for browse prices; only currencies with a fresh rate are offered.
 * The choice is a cookie; what is charged does not change.
 */
export function CurrencySwitch({ tone = 'ink' }: { tone?: 'ink' | 'paper' }) {
  const { t } = useT()
  const money = activeMoney()
  const codes = [money.charge, ...Object.keys(money.rates).sort()]
  if (codes.length < 2) return null
  return (
    <div role="group" aria-label={t('Currency')} className="flex items-center gap-1 text-sm">
      {codes.map((code) => (
        <button
          key={code}
          type="button"
          aria-pressed={money.display === code}
          onClick={() =>
            money.display !== code &&
            router.post('/currency', { currency: code }, { preserveScroll: true })
          }
          className={`rounded px-1.5 py-0.5 font-mono text-xs uppercase ${
            tone === 'paper'
              ? money.display === code
                ? 'bg-paper text-ink-900'
                : 'text-sidebar-muted hover:text-sidebar-fg'
              : money.display === code
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
