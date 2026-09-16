import Manufacturer from '#models/manufacturer'
import { findManufacturerForUser } from '#services/panel/serializers'
import { manufacturerOnboardingValidator, SUPPORTED_MATERIALS } from '#validators/panel'
import type { HttpContext } from '@adonisjs/core/http'
import { randomBytes } from 'node:crypto'

async function uniquePublicCode() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = `FM-${randomBytes(3).toString('hex').toUpperCase()}`
    if (!(await Manufacturer.query().where('public_code', code).first())) {
      return code
    }
  }
  throw new Error('Could not allocate a unique manufacturer code')
}

export default class ManufacturerOnboardingController {
  async create({ auth, inertia, response }: HttpContext) {
    if (await findManufacturerForUser(auth.getUserOrFail().id)) {
      return response.redirect().toRoute('panel.index')
    }
    return inertia.render('panel/onboarding', { materials: [...SUPPORTED_MATERIALS] })
  }

  async store({ auth, request, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    if (await findManufacturerForUser(user.id)) {
      return response.redirect().toRoute('panel.index')
    }

    const payload = await request.validateUsing(manufacturerOnboardingValidator)
    await Manufacturer.create({
      ...payload,
      userId: user.id,
      publicCode: await uniquePublicCode(),
      currencyCode: 'try',
      // Sipariş alabilmek için platform onayı gerekir (bkz. `node ace manufacturer:activate`)
      status: 'pending',
    })

    session.flash('success', 'Başvurunuz alındı, onaylandığında sipariş almaya başlayacaksınız')
    return response.redirect().toRoute('panel.index')
  }
}
