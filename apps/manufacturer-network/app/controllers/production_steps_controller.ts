import { findManufacturerForUser } from '#services/panel/serializers'
import {
  advanceProduction,
  InvalidTransitionException,
  type AdvanceInput,
} from '#services/production_lifecycle'
import { photoUrlsValidator, productionStepValidator } from '#validators/panel'
import type { HttpContext } from '@adonisjs/core/http'

export default class ProductionStepsController {
  async store({ auth, params, request, response, session }: HttpContext) {
    const manufacturer = await findManufacturerForUser(auth.getUserOrFail().id)
    if (!manufacturer) {
      return response.redirect().toRoute('panel.onboarding.create')
    }

    const payload = await request.validateUsing(productionStepValidator)
    let input: AdvanceInput
    if (payload.status === 'quality_check') {
      // Her satır bir fotoğraf URL'i
      const lines = (payload.photos ?? '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
      if (lines.length === 0) {
        session.flash('error', 'En az bir kalite kontrol fotoğrafı bağlantısı gerekli')
        return response.redirect().back()
      }
      const validated = await photoUrlsValidator
        .validate({ photos: lines })
        .catch(() => null)
      if (!validated) {
        session.flash('error', 'Fotoğraf bağlantıları geçerli https adresleri olmalı')
        return response.redirect().back()
      }
      input = { status: 'quality_check', photos: validated.photos }
    } else if (payload.status === 'shipped') {
      if (!payload.trackingNumber) {
        session.flash('error', 'Kargo takip numarası gerekli')
        return response.redirect().back()
      }
      input = { status: 'shipped', trackingNumber: payload.trackingNumber }
    } else {
      input = { status: payload.status }
    }

    try {
      await advanceProduction(manufacturer.id, Number(params.id), input)
      session.flash('success', 'Üretim durumu güncellendi')
    } catch (error) {
      if (!(error instanceof InvalidTransitionException)) {
        throw error
      }
      session.flash('error', 'Bu adım şu an uygulanamaz')
    }
    return response.redirect().toRoute('panel.requests.show', { id: params.id })
  }
}
