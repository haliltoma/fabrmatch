import type { HttpContext } from '@adonisjs/core/http'
import FinishingService from '#services/catalog/finishing_service'
import { makerFinishingValidator } from '#validators/finishing'

export default class MakerFinishingController {
  async show({ inertia, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    await user.load('manufacturerProfile')
    const service = new FinishingService()
    const [options, offered] = await Promise.all([
      service.list({ activeOnly: true }),
      service.offeredBy(user.manufacturerProfile.id),
    ])
    return inertia.render('maker/finishing', {
      options: options.map((o) => ({
        id: o.id,
        name: o.name,
        description: o.description,
        priceMinor: o.priceMinor,
        materials: o.materials as string[] | null,
      })),
      offered,
    })
  }

  async save({ request, response, session, auth }: HttpContext) {
    const { optionIds } = await request.validateUsing(makerFinishingValidator)
    const user = auth.getUserOrFail()
    await user.load('manufacturerProfile')
    await new FinishingService().setOffered(user.manufacturerProfile.id, optionIds)
    session.flash('success', 'Saved.')
    return response.redirect().toPath('/maker/finishing')
  }
}
