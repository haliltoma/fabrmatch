import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import ShippingService from '#services/shipping/shipping_service'

const priceValidator = vine.create({ priceMinor: vine.number().withoutDecimals().min(0) })

export default class AdminShippingController {
  async index({ inertia }: HttpContext) {
    return inertia.render('admin/shipping/index', {
      zones: await new ShippingService().listForAdmin(),
    })
  }

  async updateRate({ params, request, response, session, auth }: HttpContext) {
    const { priceMinor } = await request.validateUsing(priceValidator)
    await new ShippingService().setRate(params.id, priceMinor, auth.getUserOrFail().id)
    session.flash('success', 'Rate saved.')
    return response.redirect().toPath('/admin/shipping')
  }

  async updateExtra({ params, request, response, session, auth }: HttpContext) {
    const { priceMinor } = await request.validateUsing(priceValidator)
    await new ShippingService().setExtraPerKg(params.id, priceMinor, auth.getUserOrFail().id)
    session.flash('success', 'Rate saved.')
    return response.redirect().toPath('/admin/shipping')
  }
}
