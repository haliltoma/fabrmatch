import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import ManufacturerProfile from '#models/manufacturer_profile'
import MakerStatsService from '#services/manufacturing/maker_stats_service'
import TrustTierService from '#services/manufacturing/trust_tier_service'

const tierValidator = vine.create({
  tier: vine.number().withoutDecimals().min(0).max(3),
  note: vine.string().trim().maxLength(300).optional(),
})

export default class AdminMakerController {
  async index({ inertia }: HttpContext) {
    const profiles = await ManufacturerProfile.query()
      .whereNot('status', 'pending')
      .preload('user')
      .orderBy('id', 'asc')
    const stats = await new MakerStatsService().load(profiles.map((p) => p.id))

    return inertia.render('admin/makers/index', {
      makers: profiles.map((p) => {
        const s = stats.get(p.id)
        return {
          id: p.id,
          alias: p.publicAlias,
          email: p.user.email,
          city: p.city,
          country: p.country,
          status: p.status,
          trustTier: p.trustTier,
          tierLocked: p.trustTierLocked,
          completedJobs: s?.completed ?? 0,
          avgRating: s?.avgRating ?? null,
          disputeRate: s && s.total > 0 ? s.disputed / s.total : 0,
          onTimeRate: s && s.shipped > 0 ? s.onTime / s.shipped : null,
        }
      }),
    })
  }

  async setTier({ params, request, response, session, auth }: HttpContext) {
    const { tier, note } = await request.validateUsing(tierValidator)
    await new TrustTierService().setByAdmin(params.id, tier, auth.getUserOrFail().id, note)
    session.flash('success', 'Tier set and pinned.')
    return response.redirect().toPath('/admin/makers')
  }

  async unlockTier({ params, response, session, auth }: HttpContext) {
    await new TrustTierService().unlock(params.id, auth.getUserOrFail().id)
    session.flash('success', 'Tier is automatic again.')
    return response.redirect().toPath('/admin/makers')
  }
}
