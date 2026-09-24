import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import DisputeService from '#services/disputes/dispute_service'
import DisputeTransformer from '#transformers/dispute_transformer'
import { pageQueryValidator, resolveDisputeValidator } from '#validators/order'

export default class AdminDisputeController {
  async index({ inertia, request }: HttpContext) {
    const { page } = await request.validateUsing(pageQueryValidator)
    const { rows, meta } = await new DisputeService().listForAdmin({ page })
    return inertia.render('admin/disputes/index', {
      meta,
      disputes: await DisputeTransformer.transform(rows)
        .useVariant('forAdminList')
        .resolve(app.container.createResolver(), 0),
    })
  }

  async show({ inertia, params }: HttpContext) {
    const service = new DisputeService()
    const dispute = await service.findForAdmin(params.id)
    return inertia.render('admin/disputes/show', {
      dispute: await DisputeTransformer.transform(dispute)
        .useVariant('forAdmin')
        .resolve(app.container.createResolver(), 0),
      evidenceUrls: await service.evidenceUrls(dispute.evidence),
    })
  }

  async resolve({ request, auth, params, response, session }: HttpContext) {
    const data = await request.validateUsing(resolveDisputeValidator)
    await new DisputeService().resolve(params.id, auth.getUserOrFail().id, data)
    session.flash('success', 'Dispute resolved.')
    return response.redirect().back()
  }
}
