import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import fabrmatchConfig from '#config/fabrmatch'
import RoleService from '#services/identity/role_service'
import TwoFactorService from '#services/identity/two_factor_service'

/** Admins must have two-factor authentication on; until then the only door open is account security. Runs after `auth`. */
export default class TwoFactorMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    if (!fabrmatchConfig.security.requireAdminTwoFactor) return next()
    const user = ctx.auth.getUserOrFail()
    const roles = await new RoleService().getUserRoles(user)
    if (!roles.includes('admin') || new TwoFactorService().isEnabled(user)) return next()

    const message = 'Admins must turn on two-factor authentication before using the admin panel.'
    const wantsJson =
      !ctx.request.header('x-inertia') && ctx.request.accepts(['html', 'json']) === 'json'
    if (wantsJson) return ctx.response.forbidden({ error: message, code: 'two_factor_required' })

    ctx.session.flash('error', message)
    return ctx.response.redirect().toPath('/account/security')
  }
}
