import { findManufacturerForUser } from '#services/panel/serializers'
import { profileUpdateValidator, SUPPORTED_MATERIALS } from '#validators/panel'
import type { HttpContext } from '@adonisjs/core/http'

export default class ProfileController {
  async show({ auth, inertia, response }: HttpContext) {
    const manufacturer = await findManufacturerForUser(auth.getUserOrFail().id)
    if (!manufacturer) {
      return response.redirect().toRoute('panel.onboarding.create')
    }

    return inertia.render('panel/profile', {
      manufacturer: {
        displayName: manufacturer.displayName,
        publicCode: manufacturer.publicCode,
        status: manufacturer.status,
        city: manufacturer.city,
        countryCode: manufacturer.countryCode,
        materials: manufacturer.materials,
        maxBuildXMm: manufacturer.maxBuildXMm,
        maxBuildYMm: manufacturer.maxBuildYMm,
        maxBuildZMm: manufacturer.maxBuildZMm,
        dailyCapacityGrams: manufacturer.dailyCapacityGrams,
        pricePerGram: manufacturer.pricePerGram,
        hourlyRate: manufacturer.hourlyRate,
        completedOrders: manufacturer.completedOrders,
        onTimeRate: manufacturer.onTimeRate,
        stripeAccountId: manufacturer.stripeAccountId,
      },
      materials: [...SUPPORTED_MATERIALS],
    })
  }

  async update({ auth, request, response, session }: HttpContext) {
    const manufacturer = await findManufacturerForUser(auth.getUserOrFail().id)
    if (!manufacturer) {
      return response.redirect().toRoute('panel.onboarding.create')
    }

    const payload = await request.validateUsing(profileUpdateValidator)
    manufacturer.merge(payload)
    await manufacturer.save()

    session.flash('success', 'Profil güncellendi')
    return response.redirect().toRoute('panel.profile.show')
  }
}
