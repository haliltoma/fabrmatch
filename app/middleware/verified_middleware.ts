import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { isEmailVerified } from '#services/identity/email_verification'

/**
 * Money and account-trust actions need a verified e-mail (notifications, payouts and dispute
 * mail must reach a real person). Browsing stays open. Runs after `auth`.
 */
export default class VerifiedMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.getUserOrFail()
    if (isEmailVerified(user)) return next()

    const message = 'Verify your e-mail address first. We sent you a link — check your inbox.'
    const wantsJson =
      !ctx.request.header('x-inertia') && ctx.request.accepts(['html', 'json']) === 'json'
    if (wantsJson) return ctx.response.forbidden({ error: message, code: 'email_unverified' })

    ctx.session.flash('error', message)
    return ctx.response.redirect().back()
  }
}
