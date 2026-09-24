import { Exception } from '@adonisjs/core/exceptions'
import type { HttpContext } from '@adonisjs/core/http'

/** Expected business-rule failure: shown to the user, never a 500. */
export default class DomainError extends Exception {
  static status = 422

  async handle(error: this, ctx: HttpContext) {
    const wantsJson =
      !ctx.request.header('x-inertia') && ctx.request.accepts(['html', 'json']) === 'json'
    if (wantsJson) {
      return ctx.response.status(error.status).send({ error: error.message })
    }
    ctx.session.flash('error', error.message)
    return ctx.response.redirect().back()
  }
}
