import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import type { Attribution } from '#services/growth/attribution'
import ExperimentService from '#services/growth/experiment_service'
import GrowthService from '#services/growth/growth_service'

const waitlistValidator = vine.create({
  email: vine.string().trim().maxLength(254),
  interest: vine.enum(['maker', 'seller'] as const),
  city: vine.string().trim().maxLength(80).optional(),
  consent: vine.boolean(),
})

export default class MarketingController {
  async forMakers(ctx: HttpContext) {
    return this.landing(ctx, 'maker', 'marketing/for_makers')
  }

  async forSellers(ctx: HttpContext) {
    return this.landing(ctx, 'seller', 'marketing/for_sellers')
  }

  private async landing(
    { inertia, session, request }: HttpContext,
    interest: 'maker' | 'seller',
    page: 'marketing/for_makers' | 'marketing/for_sellers'
  ) {
    const growth = new GrowthService()
    await growth.track(
      'landing_view',
      (session.get('attribution') as Attribution | undefined) ?? null,
      `/for-${interest}s`
    )
    const variant = await new ExperimentService().expose(
      `${interest}_headline`,
      session.sessionId,
      request.header('user-agent') ?? ''
    )
    return inertia.render(page, {
      waiting: await growth.waitingCount(interest),
      variant,
    })
  }

  async join({ request, response, session }: HttpContext) {
    const data = await request.validateUsing(waitlistValidator)
    const { created } = await new GrowthService().joinWaitlist({
      ...data,
      attribution: (session.get('attribution') as Attribution | undefined) ?? null,
    })
    // the same visitor joining counts once for the headline test they saw
    if (created) {
      await new ExperimentService().convert(`${data.interest}_headline`, session.sessionId)
    }
    session.flash(
      'success',
      created
        ? 'You are on the list. We will write when your area opens.'
        : 'You are already on the list.'
    )
    return response.redirect().back()
  }
}
