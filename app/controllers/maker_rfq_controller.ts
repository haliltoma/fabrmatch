import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import Rfq from '#models/rfq'
import RfqBid from '#models/rfq_bid'
import RfqBidService from '#services/rfq/rfq_bid_service'
import RfqInviteService from '#services/rfq/rfq_invite_service'
import RfqTransformer from '#transformers/rfq_transformer'
import { rfqBidValidator } from '#validators/rfq'

const resolver = () => app.container.createResolver()

const bidView = (bid: RfqBid | null) =>
  bid
    ? {
        unitPriceMinor: bid.unitPriceMinor,
        leadDays: bid.leadDays,
        note: bid.note,
        status: bid.status,
      }
    : null

/** The maker's side: only requests they were invited to, and only the job, never the buyer. */
export default class MakerRfqController {
  async index({ inertia, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    await user.load('manufacturerProfile')
    const rows = await new RfqBidService().listForMaker(user.manufacturerProfile.id)
    await Promise.all(rows.map((r) => r.rfq.load('modelFile')))
    const rfqs = await RfqTransformer.transform(rows.map((r) => r.rfq))
      .useVariant('forMaker')
      .resolve(resolver(), 0)
    return inertia.render('maker/rfqs/index', {
      rfqs: rfqs.map((rfq, i) => ({ ...rfq, bid: bidView(rows[i].bid) })),
    })
  }

  async show({ inertia, auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    await user.load('manufacturerProfile')
    const rfq = await Rfq.find(Number(params.id))
    if (!rfq || !(await new RfqInviteService().isInvited(rfq.id, user.manufacturerProfile.id))) {
      return response.notFound()
    }
    await rfq.load('modelFile')
    const bid = await RfqBid.query()
      .where('rfqId', rfq.id)
      .where('manufacturerProfileId', user.manufacturerProfile.id)
      .first()
    return inertia.render('maker/rfqs/show', {
      rfq: await RfqTransformer.transform(rfq).useVariant('forMaker').resolve(resolver(), 0),
      bid: bidView(bid),
    })
  }

  async bid({ request, response, auth, params, session }: HttpContext) {
    const data = await request.validateUsing(rfqBidValidator)
    const user = auth.getUserOrFail()
    await user.load('manufacturerProfile')
    await new RfqBidService().submit(Number(params.id), user.manufacturerProfile.id, {
      unitPriceMinor: Math.round(data.price * 100),
      leadDays: data.leadDays,
      note: data.note,
    })
    session.flash('success', 'Offer sent.')
    return response.redirect().toPath(`/maker/rfqs/${params.id}`)
  }

  async withdraw({ response, auth, params, session }: HttpContext) {
    const user = auth.getUserOrFail()
    await user.load('manufacturerProfile')
    await new RfqBidService().withdraw(Number(params.id), user.manufacturerProfile.id)
    session.flash('success', 'Offer withdrawn.')
    return response.redirect().toPath(`/maker/rfqs/${params.id}`)
  }
}
