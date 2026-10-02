import type { HttpContext } from '@adonisjs/core/http'
import ShopPhotoService from '#services/catalog/shop_photo_service'
import app from '@adonisjs/core/services/app'
import PackingSlipService, { PackingSlipError } from '#services/fulfillment/packing_slip_service'
import MakerWorkService from '#services/manufacturing/maker_work_service'
import MatchingService from '#services/matching/matching_service'
import FulfillmentService from '#services/orders/fulfillment_service'
import FileAccessService from '#services/files/file_access_service'
import MatchOfferTransformer from '#transformers/match_offer_transformer'
import ProductionJobTransformer from '#transformers/production_job_transformer'
import { offersChannel } from '#services/matching/matching_effects'
import QcPhotoService from '#services/manufacturing/qc_photo_service'
import {
  evidenceUploadValidator,
  registerEvidenceValidator,
  shipValidator,
} from '#validators/order'
import { counterOfferValidator } from '#validators/maker_costs'

export default class MakerWorkController {
  async index({ inertia, auth }: HttpContext) {
    const service = new MakerWorkService()
    const profile = await service.profileFor(auth.getUserOrFail())
    const [offers, jobs] = await Promise.all([
      service.pendingOffers(profile.id),
      service.jobs(profile.id),
    ])
    const resolver = app.container.createResolver()
    return inertia.render('maker/work/index', {
      offers: await MatchOfferTransformer.transform(offers).resolve(resolver, 0),
      jobs: await ProductionJobTransformer.transform(jobs).resolve(resolver, 0),
      offersChannel: offersChannel(profile.id),
      shopPhotos: await this.shopPhotos(jobs),
    })
  }

  /** QC photos a maker may offer for the shop: only jobs that printed a shop product. */
  private async shopPhotos(jobs: Awaited<ReturnType<MakerWorkService['jobs']>>) {
    const shopPhotos = new ShopPhotoService()
    const eligible = []
    for (const job of jobs) {
      if (job.status === 'cancelled' || job.qcPhotos.length === 0) continue
      const shopModels = await shopPhotos.shopModelFileIds(job.orderId)
      if (shopModels.length === 0) continue
      eligible.push(job)
    }
    const photos = eligible.flatMap((j) => j.qcPhotos)
    const [urls, status] = await Promise.all([
      new QcPhotoService().urls(photos),
      shopPhotos.statusByQcPhoto(photos.map((p) => p.id)),
    ])
    return Object.fromEntries(
      eligible.map((j) => [
        j.id,
        j.qcPhotos.map((p) => ({ id: p.id, url: urls[p.id], status: status[p.id] ?? null })),
      ])
    )
  }

  async offerPhoto({ auth, params, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const profile = await new MakerWorkService().profileFor(user)
    await new ShopPhotoService().offer(params.id, profile.id, user.id)
    session.flash('success', 'Thanks! The photo shows in the shop once we have checked it.')
    return response.redirect().back()
  }

  async accept({ auth, params, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const profile = await new MakerWorkService().profileFor(user)
    await new MatchingService().acceptOffer(params.id, profile.id, user.id)
    session.flash('success', 'Offer accepted — the job is yours.')
    return response.redirect().back()
  }

  /** Paket V (V3): ask for more than the offer; an admin answers. Amount in the order's currency. */
  async counter({ auth, params, request, response, session }: HttpContext) {
    const { amountMinor } = await request.validateUsing(counterOfferValidator)
    const user = auth.getUserOrFail()
    const profile = await new MakerWorkService().profileFor(user)
    await new MatchingService().counterOffer(params.id, profile.id, amountMinor, user.id)
    session.flash('success', 'Counter-offer sent. We answer before the time on the card runs out.')
    return response.redirect().back()
  }

  async decline({ auth, params, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const profile = await new MakerWorkService().profileFor(user)
    await new MatchingService().declineOffer(params.id, profile.id, user.id)
    session.flash('success', 'Offer declined.')
    return response.redirect().back()
  }

  async printing({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const profile = await new MakerWorkService().profileFor(user)
    await new FulfillmentService().markPrinting(params.id, profile.id, user.id)
    return response.redirect().back()
  }

  async produced({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const profile = await new MakerWorkService().profileFor(user)
    await new FulfillmentService().markProduced(params.id, profile.id, user.id)
    return response.redirect().back()
  }

  async qcUploadUrl({ request, auth, params, response }: HttpContext) {
    const { contentType } = await request.validateUsing(evidenceUploadValidator)
    const profile = await new MakerWorkService().profileFor(auth.getUserOrFail())
    return response.json(
      await new QcPhotoService().presignUpload(params.id, profile.id, contentType)
    )
  }

  async qcRegister({ request, auth, params, response }: HttpContext) {
    const { storageKey } = await request.validateUsing(registerEvidenceValidator)
    const profile = await new MakerWorkService().profileFor(auth.getUserOrFail())
    await new QcPhotoService().register(params.id, profile.id, storageKey)
    return response.json({ ok: true })
  }

  async ship({ request, auth, params, response, session }: HttpContext) {
    const data = await request.validateUsing(shipValidator)
    const user = auth.getUserOrFail()
    const profile = await new MakerWorkService().profileFor(user)
    await new FulfillmentService().markShipped(params.id, profile.id, data, user.id)
    session.flash('success', 'Marked as shipped.')
    return response.redirect().back()
  }

  async download({ auth, params, request, response }: HttpContext) {
    const profile = await new MakerWorkService().profileFor(auth.getUserOrFail())
    const result = await new FileAccessService().download(params.grantId, profile.id, {
      ipAddress: request.ip(),
      userAgent: request.header('user-agent'),
    })
    if ('error' in result) return response.forbidden({ error: result.error })
    return response.json({ url: result.url })
  }

  /** Printable card for the parcel: the seller's brand on a storefront sale, never ours or the buyer's identity. */
  async packingSlip({ auth, params, response }: HttpContext) {
    const profile = await new MakerWorkService().profileFor(auth.getUserOrFail())
    try {
      const html = await new PackingSlipService().htmlForJob(params.id, profile.id)
      return response.header('content-type', 'text/html; charset=utf-8').send(html)
    } catch (error) {
      if (error instanceof PackingSlipError) return response.notFound()
      throw error
    }
  }
}
