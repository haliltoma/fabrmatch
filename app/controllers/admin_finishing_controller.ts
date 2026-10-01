import type { HttpContext } from '@adonisjs/core/http'
import FinishingService from '#services/catalog/finishing_service'
import { finishingCreateValidator, finishingUpdateValidator } from '#validators/finishing'

export default class AdminFinishingController {
  async index({ inertia }: HttpContext) {
    const options = await new FinishingService().list()
    return inertia.render('admin/finishing/index', {
      options: options.map((o) => ({
        id: o.id,
        code: o.code,
        name: o.name,
        description: o.description,
        priceMinor: o.priceMinor,
        extraDays: o.extraDays,
        materials: o.materials as string[] | null,
        isActive: o.isActive,
      })),
    })
  }

  async store({ request, response, session, auth }: HttpContext) {
    const data = await request.validateUsing(finishingCreateValidator)
    await new FinishingService().create(
      {
        code: data.code,
        name: data.name,
        description: data.description,
        priceMinor: data.price,
        materials: data.materials
          ? data.materials
              .split(',')
              .map((m) => m.trim())
              .filter(Boolean)
          : null,
      },
      auth.getUserOrFail().id
    )
    session.flash('success', 'Finishing option added.')
    return response.redirect().toPath('/admin/finishing')
  }

  async update({ params, request, response, session, auth }: HttpContext) {
    const data = await request.validateUsing(finishingUpdateValidator)
    await new FinishingService().update(
      params.id,
      {
        priceMinor: data.price,
        isActive: data.isActive,
        extraDays: data.extraDays,
      },
      auth.getUserOrFail().id
    )
    session.flash('success', 'Saved.')
    return response.redirect().toPath('/admin/finishing')
  }
}
