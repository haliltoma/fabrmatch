import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import UserSessionService from '#services/identity/user_session_service'

/**
 * Ties every logged-in browser session to a server-side record, so it can be listed and revoked.
 * A revoked session is logged out on its next request. Sessions that predate the record (or come
 * from a test helper) are registered lazily.
 */
export default class UserSessionMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.user
    if (!user) return next()

    if (user.suspendedAt) {
      await ctx.auth.use('web').logout()
      ctx.session.flash('error', 'This account is suspended.')
      return ctx.response.redirect().toPath('/login')
    }

    const sessions = new UserSessionService()
    const sid = ctx.session.get('sid') as string | undefined

    if (!sid) {
      ctx.session.put(
        'sid',
        await sessions.start(user.id, {
          ip: ctx.request.ip(),
          userAgent: ctx.request.header('user-agent') ?? null,
        })
      )
      return next()
    }

    if (!(await sessions.check(sid, user.id))) {
      await ctx.auth.use('web').logout()
      ctx.session.flash('error', 'This session was ended. Please sign in again.')
      return ctx.response.redirect().toPath('/login')
    }
    return next()
  }
}
