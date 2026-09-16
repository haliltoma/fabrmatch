import MatchOffer from '#models/match_offer'
import ProductionRequest from '#models/production_request'
import {
  findManufacturerForUser,
  serializeJob,
  serializeJobDetail,
  serializeManufacturer,
  serializeOffer,
} from '#services/panel/serializers'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'

const ACTIVE_STATUSES = ['accepted', 'in_production', 'quality_check', 'shipped'] as const

export default class PanelController {
  async index({ auth, inertia, response }: HttpContext) {
    const manufacturer = await findManufacturerForUser(auth.getUserOrFail().id)
    if (!manufacturer) {
      return response.redirect().toRoute('panel.onboarding.create')
    }

    const offers = await MatchOffer.query()
      .where('manufacturer_id', manufacturer.id)
      .where('status', 'offered')
      .where('expires_at', '>', DateTime.now().toSQL()!)
      .preload('productionRequest')
      .orderBy('expires_at', 'asc')
    const jobs = await ProductionRequest.query()
      .where('manufacturer_id', manufacturer.id)
      .whereIn('status', [...ACTIVE_STATUSES])
      .orderBy('requested_delivery_by', 'asc')

    return inertia.render('panel/dashboard', {
      manufacturer: serializeManufacturer(manufacturer),
      offers: offers.map(serializeOffer),
      jobs: jobs.map(serializeJob),
    })
  }

  async show({ auth, params, inertia, response }: HttpContext) {
    const manufacturer = await findManufacturerForUser(auth.getUserOrFail().id)
    if (!manufacturer) {
      return response.redirect().toRoute('panel.onboarding.create')
    }

    const request = await ProductionRequest.query()
      .where('id', params.id)
      .where('manufacturer_id', manufacturer.id)
      .first()
    if (!request) {
      return response.redirect().toRoute('panel.index')
    }

    const openOffer = await MatchOffer.query()
      .where('production_request_id', request.id)
      .where('manufacturer_id', manufacturer.id)
      .where('status', 'offered')
      .first()

    return inertia.render('panel/request', {
      job: serializeJobDetail(request),
      openOfferId: openOffer?.id ?? null,
    })
  }
}
