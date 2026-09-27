import { formatMoney, formatPrice } from '~/lib/format'
import { useT } from '~/lib/i18n'
import { activeMoney } from '~/lib/display_money'

export function Money({
  minor,
  currency = 'TRY',
  className = '',
}: {
  minor: number
  currency?: string
  className?: string
}) {
  return (
    <span className={`tabular whitespace-nowrap ${className}`}>{formatMoney(minor, currency)}</span>
  )
}

export type Amount = { currency: string; minor: number }

/** Amounts in different currencies are never added together: one figure per currency. */
export function MoneyList({ amounts, className = '' }: { amounts: Amount[]; className?: string }) {
  if (amounts.length === 0) return <Money minor={0} className={className} />
  return (
    <span className={className}>
      {amounts.map((a, i) => (
        <span key={a.currency}>
          {i > 0 && ' · '}
          <Money minor={a.minor} currency={a.currency} />
        </span>
      ))}
    </span>
  )
}

/** A browse price in the visitor's currency (≈ when converted). Not for charged amounts. */
export function Price({
  minor,
  currency = 'TRY',
  className = '',
}: {
  minor: number
  currency?: string
  className?: string
}) {
  useT()
  return (
    <span className={`tabular whitespace-nowrap ${className}`}>{formatPrice(minor, currency)}</span>
  )
}

/** Says converted prices are estimates and what is actually charged; nothing when not converted. */
export function ChargeNote({ className = '' }: { className?: string }) {
  const { t } = useT()
  const money = activeMoney()
  if (money.display === money.charge || !money.rates[money.display]) return null
  return (
    <p className={`text-xs text-ink-600 ${className}`}>
      {t("≈ {display} at today's rate. You pay in {charge}.", {
        display: money.display,
        charge: money.charge,
      })}
    </p>
  )
}
