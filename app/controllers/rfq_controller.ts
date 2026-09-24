import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import Material from '#models/material'
import ModelFile from '#models/model_file'
import RfqService from '#services/rfq/rfq_service'
import { bidsForBuyer } from '#services/rfq/rfq_view'
import RfqTransformer from '#transformers/rfq_transformer'
import { rfqAwardValidator, rfqCreateValidator } from '#validators/rfq'

const resolver = () => app.container.createResolver()

/** The buyer's side: open a request, compare offers, choose one. */
export default class RfqController {
  async index({ inertia, auth }: HttpContext) {
    const rfqs = await new RfqService().listForBuyer(auth.getUserOrFail().id)
    await Promise.all(rfqs.map((r) => r.load('modelFile')))
    return inertia.render('rfq/index', {
      rfqs: await RfqTransformer.transform(rfqs).useVariant('forBuyer').resolve(resolver(), 0),
    })
  }

  async create({ inertia, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    await new RfqService().assertCorporate(user)
    const [files, materials] = await Promise.all([
      ModelFile.query()
        .where('ownerId', user.id)
        .where('analysisStatus', 'done')
        .whereNull('blockedAt')
        .orderBy('id', 'desc')
        .limit(100),
      Material.query().where('isActive', true).orderBy('name'),
    ])
    return inertia.render('rfq/create', {
      files: files
        .filter((f) => f.isPrintable !== false)
        .map((f) => ({ id: f.id, name: f.originalName })),
      materials: materials.map((m) => ({ code: m.code, name: m.name, technology: m.technology })),
    })
  }

  async store({ request, response, auth, session }: HttpContext) {
    const data = await request.validateUsing(rfqCreateValidator)
    const rfq = await new RfqService().create(auth.getUserOrFail(), data)
    session.flash('success', 'Your request is out. Makers can now send offers.')
    return response.redirect().toPath(`/rfqs/${rfq.id}`)
  }

  async show({ inertia, auth, params, response }: HttpContext) {
    const service = new RfqService()
    const rfq = await service.findForBuyer(Number(params.id), auth.getUserOrFail().id)
    if (!rfq) return response.notFound()
    await rfq.load('modelFile')
    return inertia.render('rfq/show', {
      rfq: await RfqTransformer.transform(rfq).useVariant('forBuyer').resolve(resolver(), 0),
      bids: await bidsForBuyer(rfq),
    })
  }

  async award({ request, response, auth, params, session }: HttpContext) {
    const { bidId, shippingAddress } = await request.validateUsing(rfqAwardValidator)
    const { order } = await new RfqService().award(
      Number(params.id),
      auth.getUserOrFail(),
      bidId,
      shippingAddress
    )
    session.flash('success', 'Offer chosen. Review the order and pay to start production.')
    return response.redirect().toRoute('order.show', { id: order.id })
  }

  async cancel({ response, auth, params, session }: HttpContext) {
    await new RfqService().cancel(Number(params.id), auth.getUserOrFail().id)
    session.flash('success', 'Request cancelled.')
    return response.redirect().toPath('/rfqs')
  }
}
