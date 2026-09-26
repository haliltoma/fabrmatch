import type { HttpContext } from '@adonisjs/core/http'
import limiter from '@adonisjs/limiter/services/main'
import User from '#models/user'
import TwoFactorService from '#services/identity/two_factor_service'
import UserSessionService from '#services/identity/user_session_service'
import { redirectAfterSignIn } from '#services/identity/landing_service'
import { codeValidator } from '#validators/account_security'
import { TWO_FACTOR_PENDING, TWO_FACTOR_PENDING_MINUTES } from '#controllers/session_controller'

export const twoFactorThrottleKey = (userId: number) => `two-factor:user:${userId}`

/** Second step of login: the password already checked out, now prove the authenticator or a backup code. */
export default class TwoFactorChallengeController {
  private pendingUserId(session: HttpContext['session']): number | null {
    const pending = session.get(TWO_FACTOR_PENDING) as { userId: number; at: number } | undefined
    if (!pending) return null
    if (Date.now() - pending.at > TWO_FACTOR_PENDING_MINUTES * 60_000) {
      session.forget(TWO_FACTOR_PENDING)
      return null
    }
    return pending.userId
  }

  async create({ inertia, session, response }: HttpContext) {
    if (this.pendingUserId(session) === null) return response.redirect().toPath('/login')
    return inertia.render('auth/two_factor', {})
  }

  async store(ctx: HttpContext) {
    const { request, response, session, auth } = ctx
    const userId = this.pendingUserId(session)
    if (userId === null) {
      session.flash('error', 'Your sign-in expired. Start again.')
      return response.redirect().toPath('/login')
    }
    const { code } = await request.validateUsing(codeValidator)

    // 5 wrong codes per 15 min, then blocked for 30 min — the code space is small
    const throttle = limiter.use({
      requests: 5,
      duration: '15 minutes',
      blockDuration: '30 minutes',
    })
    await throttle.consume(twoFactorThrottleKey(userId))

    const user = await User.findOrFail(userId)
    if (user.suspendedAt) {
      session.forget(TWO_FACTOR_PENDING)
      session.flash('error', 'This account is suspended.')
      return response.redirect().toPath('/login')
    }
    const method = await new TwoFactorService().verifyLogin(user, code)
    if (method === null) {
      session.flash('error', 'That code is not right. Try again or use a backup code.')
      return response.redirect().toPath('/login/two-factor')
    }

    await throttle.delete(twoFactorThrottleKey(userId))
    session.forget(TWO_FACTOR_PENDING)
    await auth.use('web').login(user)
    session.put(
      'sid',
      await new UserSessionService().start(user.id, {
        ip: request.ip(),
        userAgent: request.header('user-agent') ?? null,
      })
    )
    if (method === 'backup') {
      session.flash('success', 'Signed in with a backup code. Generate a fresh set soon.')
    }
    return redirectAfterSignIn(ctx, user)
  }
}
