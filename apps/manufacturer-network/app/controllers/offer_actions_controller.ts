import { findManufacturerForUser } from '#services/panel/serializers'
import { acceptOffer, declineOffer, InvalidTransitionException } from '#services/production_lifecycle'
import type { HttpContext } from '@adonisjs/core/http'

export default class OfferActionsController {
  async accept({ auth, params, response, session }: HttpContext) {
    const manufacturer = await findManufacturerForUser(auth.getUserOrFail().id)
    if (!manufacturer) {
      return response.redirect().toRoute('panel.onboarding.create')
    }
    try {
      const event = await acceptOffer(manufacturer.id, Number(params.id))
      session.flash('success', 'Teklif kabul edildi')
      return response.redirect().toRoute('panel.requests.show', { id: event.productionRequestId })
    } catch (error) {
      if (error instanceof InvalidTransitionException) {
        session.flash('error', 'Bu teklif artık kabul edilemiyor')
        return response.redirect().toRoute('panel.index')
      }
      throw error
    }
  }

  async decline({ auth, params, response, session }: HttpContext) {
    const manufacturer = await findManufacturerForUser(auth.getUserOrFail().id)
    if (!manufacturer) {
      return response.redirect().toRoute('panel.onboarding.create')
    }
    try {
      await declineOffer(manufacturer.id, Number(params.id))
      session.flash('success', 'Teklif reddedildi, iş başka bir üreticiye yönlendirilecek')
    } catch (error) {
      if (!(error instanceof InvalidTransitionException)) {
        throw error
      }
      session.flash('error', 'Bu teklif artık açık değil')
    }
    return response.redirect().toRoute('panel.index')
  }
}
