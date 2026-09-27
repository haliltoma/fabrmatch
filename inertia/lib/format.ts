import { currentLocale } from '~/lib/i18n'
import { convertPrice } from '~/lib/display_money'

const intlLocale = () => (currentLocale() === 'tr' ? 'tr-TR' : 'en')

export function formatMoney(minor: number, currency: string = 'TRY'): string {
  if (currentLocale() === 'tr') {
    const amount = new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(minor / 100)
    return `${amount} ${currency}`
  }
  return `${(minor / 100).toFixed(2)} ${currency}`
}

/** A browse price shown in the visitor's currency, prefixed with ≈ when converted. */
export function formatPrice(minor: number, currency: string = 'TRY'): string {
  const shown = convertPrice(minor, currency)
  return `${shown.approx ? '≈ ' : ''}${formatMoney(shown.minor, shown.currency)}`
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(intlLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(intlLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
