import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import PrintProfileService from '#services/catalog/print_profile_service'

const createValidator = vine.create({
  code: vine.string().trim().minLength(1).maxLength(32),
  name: vine.string().trim().minLength(1).maxLength(100),
  technology: vine.enum(['FDM', 'SLA', 'SLS'] as const),
  layerHeightMicron: vine.number().withoutDecimals(),
  infillPercent: vine.number().withoutDecimals(),
  timeFactorBps: vine.number().withoutDecimals(),
  postProcess: vine.string().trim().maxLength(120).optional(),
})
const toggleValidator = vine.create({ isActive: vine.boolean() })

export default class AdminPrintProfileController {
  async index({ inertia }: HttpContext) {
    const profiles = await new PrintProfileService().list()
    return inertia.render('admin/profiles/index', {
      profiles: profiles.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        technology: p.technology,
        layerHeightMicron: p.layerHeightMicron,
        infillPercent: p.infillPercent,
        timeFactorBps: p.timeFactorBps,
        postProcess: p.postProcess,
        isActive: p.isActive,
      })),
    })
  }

  async store({ request, response, session, auth }: HttpContext) {
    const data = await request.validateUsing(createValidator)
    await new PrintProfileService().create(data, auth.getUserOrFail().id)
    session.flash('success', 'Profile added.')
    return response.redirect().toPath('/admin/profiles')
  }

  async toggle({ params, request, response, auth }: HttpContext) {
    const { isActive } = await request.validateUsing(toggleValidator)
    await new PrintProfileService().setActive(Number(params.id), isActive, auth.getUserOrFail().id)
    return response.redirect().toPath('/admin/profiles')
  }
}
