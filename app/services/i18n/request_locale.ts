import type { HttpContext } from '@adonisjs/core/http'
import { LOCALE_COOKIE, isLocale, pickLocale } from '#services/i18n/locale'

/**
 * The language of this request: `?lang=tr|en` in the URL (how search engines reach each language
 * version through hreflang), then the visitor's saved choice, then the browser's languages.
 */
export function requestLocale(ctx: Pick<HttpContext, 'request'>) {
  const fromUrl = ctx.request.qs().lang
  return pickLocale(
    isLocale(fromUrl) ? fromUrl : ctx.request.plainCookie(LOCALE_COOKIE),
    ctx.request.header('accept-language')
  )
}
