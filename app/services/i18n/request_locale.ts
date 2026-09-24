import type { HttpContext } from '@adonisjs/core/http'
import { LOCALE_COOKIE, pickLocale } from '#services/i18n/locale'

export function requestLocale(ctx: Pick<HttpContext, 'request'>) {
  return pickLocale(ctx.request.plainCookie(LOCALE_COOKIE), ctx.request.header('accept-language'))
}
