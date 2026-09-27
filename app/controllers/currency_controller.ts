import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { BASE_CURRENCY, FOREIGN_CURRENCIES } from '#services/pricing/fx'
import { CURRENCY_COOKIE } from '#services/pricing/display_currency'

const validator = vine.create({ currency: vine.enum([BASE_CURRENCY, ...FOREIGN_CURRENCIES]) })

/** Remembers which currency browse prices are shown in (P1). Charges are unaffected. */
export default class CurrencyController {
  async update({ request, response }: HttpContext) {
    const { currency } = await request.validateUsing(validator)
    response.plainCookie(CURRENCY_COOKIE, currency, {
      maxAge: '365d',
      sameSite: 'lax',
      httpOnly: false,
      path: '/',
    })
    return response.redirect().back()
  }
}
