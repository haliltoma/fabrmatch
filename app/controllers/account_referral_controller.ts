import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import ReferralService from '#services/growth/referral_service'

export default class AccountReferralController {
  async show({ inertia, auth }: HttpContext) {
    const summary = await new ReferralService().summary(auth.getUserOrFail())
    const base = env.get('APP_URL').replace(/\/$/, '')
    return inertia.render('account/referrals', {
      ...summary,
      link: `${base}/signup?ref=${summary.code}`,
    })
  }
}
