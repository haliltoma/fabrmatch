import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { readFile } from 'node:fs/promises'
import SellerProfile from '#models/seller_profile'
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

  async uploadLogo({ request, response, auth, session }: HttpContext) {
    const file = request.file('logo', { size: '1mb' })
    if (!file || !file.tmpPath || !file.isValid) {
      session.flash('error', 'Choose an image')
      return response.redirect().toPath('/seller/branding')
    }
    // the type is read from the bytes, not trusted from the name or the browser
    await new BrandingService().saveLogo(auth.getUserOrFail().id, await readFile(file.tmpPath))
    session.flash('success', 'Logo saved. New packing cards show it.')
    return response.redirect().toPath('/seller/branding')
  }

  async removeLogo({ response, auth, session }: HttpContext) {
    await new BrandingService().removeLogo(auth.getUserOrFail().id)
    session.flash('success', 'Logo removed.')
    return response.redirect().toPath('/seller/branding')
  }

  /** The seller's own logo, for the preview on this page. */
  async logo({ response, auth }: HttpContext) {
    const profile = await SellerProfile.query().where('userId', auth.getUserOrFail().id).first()
    const logo = profile ? await new BrandingService().logo(profile) : null
    if (!logo) return response.notFound()
    response.header('Content-Type', logo.contentType)
    response.header('Cache-Control', 'private, no-store')
    response.header('X-Content-Type-Options', 'nosniff')
    return response.send(logo.bytes)
  }
}
