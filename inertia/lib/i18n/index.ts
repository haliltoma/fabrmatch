import { usePage } from '@inertiajs/react'
import { tr } from '~/lib/i18n/tr'
import { trPatterns } from '~/lib/i18n/patterns'

export type Locale = 'en' | 'tr'
const dictionaries: Record<Locale, Record<string, string>> = { en: {}, tr }

/** Translate an English source string; unknown strings and English fall through unchanged. */
export function translate(locale: Locale, text: string, vars?: Record<string, string | number>) {
  let out = dictionaries[locale]?.[text] ?? text
  if (out === text && locale === 'tr') {
    for (const [pattern, render] of trPatterns) {
      const match = text.match(pattern)
      if (match) {
        out = render(match)
        break
      }
    }
  }
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, String(v))
  return out
}

let activeLocale: Locale = 'en'

/** The locale of the page being rendered; date and money formatters read it. */
export function currentLocale() {
  return activeLocale
}

function setActiveLocale(locale: Locale) {
  activeLocale = locale
}

export function useT() {
  const { props } = usePage<{ locale?: Locale }>()
  const locale = props.locale ?? 'en'
  setActiveLocale(locale)
  return {
    locale,
    t: (text: string, vars?: Record<string, string | number>) => translate(locale, text, vars),
  }
}
