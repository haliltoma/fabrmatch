import type { Locale } from '#services/i18n/locale'

/** The currency a visitor asked for; wins over everything we could guess. */
export const CURRENCY_COOKIE = 'fm_currency'

const EUROZONE = [
  'AT',
  'BE',
  'HR',
  'CY',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'IE',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'NL',
  'PT',
  'SK',
  'SI',
  'ES',
]

const BY_COUNTRY: Record<string, string> = {
  TR: 'TRY',
  US: 'USD',
  GB: 'GBP',
  ...Object.fromEntries(EUROZONE.map((c) => [c, 'EUR'])),
}

/** ISO country → the currency we would show there, or null when we have none for it. */
export function currencyForCountry(country: string | null | undefined): string | null {
  return BY_COUNTRY[(country ?? '').trim().toUpperCase()] ?? null
}

/** The region of the first Accept-Language tag that carries one ("en-GB" → "GB"). */
export function countryFromAcceptLanguage(header: string | null | undefined): string | null {
  for (const part of (header ?? '').split(',')) {
    const subtags = part.trim().split(';')[0].split('-').slice(1)
    const region = subtags.find((s) => /^[A-Za-z]{2}$/.test(s))
    if (region) return region.toUpperCase()
  }
  return null
}

/**
 * Which currency browse prices are shown in (P1, docs: .plans/regional-pricing.md):
 * the visitor's choice, then the country the edge reports, then the browser's region, then the
 * language default (Turkish → TRY, anything else → USD). Only currencies in `available` (the
 * ones we hold a fresh rate for) qualify; TRY always does.
 */
export function pickDisplayCurrency(input: {
  available: string[]
  locale: Locale
  cookie?: string | null
  edgeCountry?: string | null
  acceptLanguage?: string | null
}): string {
  const ok = (code: string | null | undefined): code is string =>
    !!code && input.available.includes(code)
  const candidates = [
    input.cookie ? input.cookie.toUpperCase() : null,
    currencyForCountry(input.edgeCountry),
    currencyForCountry(countryFromAcceptLanguage(input.acceptLanguage)),
    input.locale === 'tr' ? 'TRY' : 'USD',
  ]
  return candidates.find(ok) ?? 'TRY'
}
