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
    return response.redirect().back()
  }
}
