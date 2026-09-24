import User from '#models/user'
import { loginValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'
import limiter from '@adonisjs/limiter/services/main'
import TwoFactorService from '#services/identity/two_factor_service'
import UserSessionService from '#services/identity/user_session_service'

export const TWO_FACTOR_PENDING = 'twoFactorPending'
export const TWO_FACTOR_PENDING_MINUTES = 10

export default class SessionController {
  async create({ inertia }: HttpContext) {
    return inertia.render('auth/login', {})
  }

  async store({ request, auth, response, session }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator)

    // Rate limit: 5 attempts per IP + 10 per email per 15 min
    const ipThrottle = limiter.use({
      requests: 10,
      duration: '15 minutes',
      blockDuration: '15 minutes',
    })
    const emailThrottle = limiter.use({
      requests: 5,
      duration: '15 minutes',
      blockDuration: '30 minutes',
    })

    await ipThrottle.consume(`login:ip:${request.ip()}`)
    await emailThrottle.consume(`login:email:${email}`)

    const user = await User.verifyCredentials(email, password)
    if (user.suspendedAt) {
      session.flash(
        'error',
        'This account is suspended. Contact support if you think this is a mistake.'
      )
      return response.redirect().toPath('/login')
    }

    if (new TwoFactorService().isEnabled(user)) {
      // password is right, but nobody is signed in until the second factor checks out
      session.put(TWO_FACTOR_PENDING, { userId: user.id, at: Date.now() })
      return response.redirect().toPath('/login/two-factor')
    }

    await auth.use('web').login(user)
    session.put(
      'sid',
      await new UserSessionService().start(user.id, {
        ip: request.ip(),
        userAgent: request.header('user-agent') ?? null,
      })
    )
    response.redirect().toRoute('home')
  }

  async destroy({ auth, response }: HttpContext) {
    await auth.use('web').logout()
    response.redirect().toRoute('session.create')
  }
}
