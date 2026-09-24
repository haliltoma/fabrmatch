import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import BrandingService from '#services/fulfillment/branding_service'

const validator = vine.create({
  brandName: vine.string().trim().maxLength(80).optional(),
  brandMessage: vine.string().trim().maxLength(300).optional(),
})

export default class SellerBrandingController {
  async show({ inertia, auth }: HttpContext) {
    return inertia.render(
      'seller/branding',
      await new BrandingService().get(auth.getUserOrFail().id)
    )
  }

  async save({ request, response, auth, session }: HttpContext) {
    const data = await request.validateUsing(validator)
    await new BrandingService().save(auth.getUserOrFail().id, data)
    session.flash('success', 'Saved. New parcels carry your name and message.')
    return response.redirect().toPath('/seller/branding')
  }
}
