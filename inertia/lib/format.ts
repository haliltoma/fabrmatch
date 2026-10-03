import { currentLocale } from '~/lib/i18n'
import { convertPrice } from '~/lib/display_money'

const intlLocale = () => (currentLocale() === 'tr' ? 'tr-TR' : 'en')

/**
 * Dates are shown in one fixed zone. Pages are rendered on the server (TZ=UTC) and then in the
 * browser; formatting in the visitor's own zone would make the two disagree and break hydration.
 * Türkiye is the first market, so its zone is the shared one.
 */
const DISPLAY_TIME_ZONE = 'Europe/Istanbul'

/** A count with thousands separators in the page language (same output on server and client). */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat(intlLocale()).format(n)
}

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

/** A price difference with its sign after the ≈ (≈ +1.98 USD, +19,80 TRY). */
export function formatPriceDelta(minor: number, currency: string = 'TRY'): string {
  const shown = convertPrice(Math.abs(minor), currency)
  const sign = minor < 0 ? '−' : '+'
  return `${shown.approx ? '≈ ' : ''}${sign}${formatMoney(shown.minor, shown.currency)}`
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(intlLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: DISPLAY_TIME_ZONE,
  })
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(intlLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: DISPLAY_TIME_ZONE,
  })
}
