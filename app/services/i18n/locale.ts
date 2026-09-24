export const LOCALES = ['en', 'tr'] as const
export type Locale = (typeof LOCALES)[number]
export const LOCALE_COOKIE = 'fm_lang'

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}

/**
 * The visitor's explicit choice (cookie) wins; otherwise the first supported language in
 * Accept-Language; otherwise English. Turkish is the launch market, English the fallback.
 */
export function pickLocale(cookie: unknown, acceptLanguage: string | null | undefined): Locale {
  if (isLocale(cookie)) return cookie
  for (const part of (acceptLanguage ?? '').split(',')) {
    const code = part.trim().split(';')[0].split('-')[0].toLowerCase()
    if (isLocale(code)) return code
  }
  return 'en'
}
