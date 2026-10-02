import type { HttpContext } from '@adonisjs/core/http'
import MatchingService from '#services/matching/matching_service'
import MatchOffer from '#models/match_offer'
import MatchSuggestionService from '#services/matching/match_suggestion_service'
import SettingsService from '#services/settings/settings_service'
import { adminOfferValidator, matchingModeValidator } from '#validators/admin_matching'

/** Admin matching: orders waiting for a maker, suggestions per order, and the auto/manual switch. */
export default class AdminMatchingController {
  async index({ inertia }: HttpContext) {
    return inertia.render('admin/matching/index', {
      orders: await new MatchSuggestionService().queue(),
      autoOffer: MatchingService.autoOffer(),
    })
  }

  async show({ params, inertia }: HttpContext) {
    return inertia.render('admin/matching/show', {
      ...(await new MatchSuggestionService().forOrder(params.id)),
      autoOffer: MatchingService.autoOffer(),
    })
  }

  async offer({ params, request, response, session, auth }: HttpContext) {
    const { manufacturerProfileId } = await request.validateUsing(adminOfferValidator)
    // manual mode: the admin decides, rules are advice; automatic mode: rules are required
    await new MatchingService().offerTo(params.id, manufacturerProfileId, auth.getUserOrFail().id, {
      allowOverride: !MatchingService.autoOffer(),
    })
    session.flash('success', 'Offer sent. The maker has to accept it before the time runs out.')
    return response.redirect().toPath(`/admin/matching/${params.id}`)
  }

  /** Paket V (V3): agree to the maker's price; the offer is accepted at it. */
  async approveCounter({ params, response, session, auth }: HttpContext) {
    const job = await new MatchingService().approveCounter(params.id, auth.getUserOrFail().id)
    session.flash('success', 'Counter-offer approved. The maker has the job at their price.')
    return response.redirect().toPath(`/admin/matching/${job.orderId}`)
  }

  /** Keep the offer's price: the next maker is tried. */
  async rejectCounter({ params, response, session, auth }: HttpContext) {
    const offer = await MatchOffer.findOrFail(params.id)
    await new MatchingService().rejectCounter(params.id, auth.getUserOrFail().id)
    session.flash('success', 'Counter-offer declined. The order goes to the next maker.')
    return response.redirect().toPath(`/admin/matching/${offer.orderId}`)
  }

  /** Turning automatic matching on also starts a round for every order already waiting. */
  async mode({ request, response, session, auth }: HttpContext) {
    const { auto } = await request.validateUsing(matchingModeValidator)
    await new SettingsService().set('matching.autoOffer', auto ? 1 : 0, auth.getUserOrFail().id)
    if (auto) {
      await new MatchingService().resumeWaiting()
      session.flash('success', 'Automatic matching is on. Waiting orders got their offers.')
    } else {
      session.flash('success', 'Automatic matching is off. New paid orders wait here for you.')
    }
    return response.redirect().toPath('/admin/matching')
  }
}
