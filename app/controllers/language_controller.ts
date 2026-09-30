import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { LOCALES, LOCALE_COOKIE } from '#services/i18n/locale'

const validator = vine.create({ lang: vine.enum(LOCALES) })

export default class LanguageController {
  async update({ request, response, auth }: HttpContext) {
    const { lang } = await request.validateUsing(validator)
    response.plainCookie(LOCALE_COOKIE, lang, {
      maxAge: '365d',
      sameSite: 'lax',
      httpOnly: false,
      path: '/',
    })
    await auth.check()
    const user = auth.user
    if (user && user.locale !== lang) {
      user.locale = lang
      await user.save()
    }
    // back to the same page, minus a ?lang= that would otherwise override the new choice
    const back = new URL(request.header('referer') ?? '/', request.completeUrl())
    if (back.host !== new URL(request.completeUrl()).host) return response.redirect('/')
    back.searchParams.delete('lang')
    return response.redirect(`${back.pathname}${back.search}`)
  }
}
