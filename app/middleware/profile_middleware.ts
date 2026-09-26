import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Panels that work on the seller/maker profile need it to exist. A user who picked a role in
 * onboarding but left before the profile step has the role and no profile; send them back to
 * finish it instead of crashing on a null profile.
 */
export default class ProfileMiddleware {
  async handle(ctx: HttpContext, next: NextFn, options: { role: 'seller' | 'manufacturer' }) {
    const user = ctx.auth.getUserOrFail()
    const relation = options.role === 'seller' ? 'sellerProfile' : 'manufacturerProfile'
    await user.load(relation)
    if (!user[relation]) {
      ctx.session.flash('error', 'Complete your profile to continue.')
      return ctx.response.redirect().toPath('/onboarding/profile')
    }
    return next()
  }
}
