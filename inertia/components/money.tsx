import { formatMoney } from '~/lib/format'

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
