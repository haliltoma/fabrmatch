import ReferralService from '#services/growth/referral_service'
import LifecycleService from '#services/notifications/lifecycle_service'
import GrowthService from '#services/growth/growth_service'
import type { Attribution } from '#services/growth/attribution'
import User from '#models/user'
import { requestLocale } from '#services/i18n/request_locale'
import { signupValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'

export default class NewAccountController {
  async create({ inertia, session }: HttpContext) {
    const invited = new ReferralService().enabled() && session.has('referral')
    return inertia.render('auth/signup', { invited })
  }

  async store(ctx: HttpContext) {
    const { request, response, auth, session } = ctx
    const { passwordConfirmation, ...payload } = await request.validateUsing(signupValidator)
    const user = await User.create({ ...payload, locale: requestLocale(ctx) })

    await new GrowthService().creditSignup(
      user,
      (session.get('attribution') as Attribution | undefined) ?? null
    )
    const gift = await new ReferralService().attach(user, session.get('referral')).catch(() => null)
    session.forget('referral')
    if (gift) {
      session.flash('success', `Welcome! Your invite gift code for a first order: ${gift.code}`)
    }
    await new LifecycleService().welcome(user.id)
    await auth.use('web').login(user)
    response.redirect().toRoute('home')
  }
}
