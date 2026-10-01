import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import AdminQueueService, { BULK_ACTIONS } from '#services/admin/queue_service'
import SupportService from '#services/support/support_service'
import ChargebackService from '#services/payments/chargeback_service'
import ContentReportService from '#services/admin/content_report_service'
import FraudService from '#services/admin/fraud_service'
import OrderService from '#services/orders/order_service'
import MatchingService from '#services/matching/matching_service'
import ShopPhotoService from '#services/catalog/shop_photo_service'

const ackValidator = vine.create({
  queue: vine.enum(['payment_review', 'reconcile']),
  ref: vine.string().trim().minLength(1).maxLength(200),
})

const fraudDecisionValidator = vine.create({ decision: vine.enum(['clear', 'reject']) })

const reportDecisionValidator = vine.create({
  decision: vine.enum(['block', 'dismiss']),
  reason: vine.string().trim().maxLength(300).optional(),
})

const chargebackValidator = vine.create({
  decision: vine.enum(['won', 'lost']),
  note: vine.string().trim().maxLength(300).optional(),
})

const makerValidator = vine.create({ decision: vine.enum(['approve', 'reject']) })

const bulkValidator = vine.create({
  action: vine.enum(BULK_ACTIONS),
  refs: vine.array(vine.string().trim().minLength(1).maxLength(200)).minLength(1).maxLength(100),
})

export default class AdminQueueController {
  async index({ inertia }: HttpContext) {
    const queues = new AdminQueueService()
    const [
      unmatched,
      overdue,
      reviews,
      findings,
      makers,
      fraud,
      reports,
      chargebacks,
      support,
      shopPhotos,
    ] = await Promise.all([
      queues.unmatchedOrders(),
      queues.overdueJobs(),
      queues.paymentReviews(),
      queues.reconcileFindings(),
      queues.pendingMakers(),
      new FraudService().listOpen(),
      new ContentReportService().listOpen(),
      new ChargebackService().listOpen(),
      new SupportService().listOpen(),
      new ShopPhotoService().pending(),
    ])
    return inertia.render('admin/queues/index', {
      unmatched,
      overdue,
      paymentReviews: reviews,
      reconcile: findings,
      pendingMakers: makers,
      fraud,
      reports,
      chargebacks,
      support,
      shopPhotos,
    })
  }

  async shopPhotoDecision({ params, request, response, session, auth }: HttpContext) {
    const { decision } = await request.validateUsing(makerValidator)
    await new ShopPhotoService().review(Number(params.id), decision, auth.getUserOrFail().id)
    session.flash(
      'success',
      decision === 'approve' ? 'Photo is now in the shop.' : 'Photo rejected.'
    )
    return response.redirect().toPath('/admin/queues')
  }

  async rematch({ params, response, session, auth }: HttpContext) {
    const offer = await new MatchingService().restart(Number(params.id), auth.getUserOrFail().id)
    session.flash(
      'success',
      offer ? 'Matching restarted — an offer is out.' : 'Matching restarted, no maker is eligible.'
    )
    return response.redirect().toPath('/admin/queues')
  }

  async fraudDecision({ params, request, response, session, auth }: HttpContext) {
    const { decision } = await request.validateUsing(fraudDecisionValidator)
    const adminId = auth.getUserOrFail().id
    const orderId = Number(params.id)
    const fraud = new FraudService()
    if (decision === 'clear') {
      if (await fraud.clear(orderId, adminId)) {
        await new MatchingService().start(orderId, adminId)
      }
      session.flash('success', 'Cleared — matching started.')
    } else {
      await fraud.reject(orderId, adminId)
      await new OrderService().cancelWithRefund(orderId, { actorId: adminId, by: 'admin' })
      session.flash('success', 'Order rejected and refunded.')
    }
    return response.redirect().toPath('/admin/queues')
  }

  async reportDecision({ params, request, response, session, auth }: HttpContext) {
    const { decision, reason } = await request.validateUsing(reportDecisionValidator)
    const service = new ContentReportService()
    const adminId = auth.getUserOrFail().id
    if (decision === 'block') {
      await service.block(Number(params.id), adminId, reason ?? '')
      session.flash('success', 'Model blocked and listings hidden.')
    } else {
      await service.dismiss(Number(params.id), adminId)
      session.flash('success', 'Report dismissed.')
    }
    return response.redirect().toPath('/admin/queues')
  }

  async chargebackDecision({ params, request, response, session, auth }: HttpContext) {
    const { decision, note } = await request.validateUsing(chargebackValidator)
    const service = new ChargebackService()
    const adminId = auth.getUserOrFail().id
    if (decision === 'won') await service.won(Number(params.id), adminId, note)
    else await service.lost(Number(params.id), adminId, note)
    session.flash(
      'success',
      decision === 'won' ? 'Marked won — payouts can proceed.' : 'Marked lost.'
    )
    return response.redirect().toPath('/admin/queues')
  }

  async supportAnswered({ params, response, session, auth }: HttpContext) {
    await new SupportService().markAnswered(Number(params.id), auth.getUserOrFail().id)
    session.flash('success', 'Marked as answered.')
    return response.redirect().toPath('/admin/queues')
  }

  async acknowledge({ request, response, session, auth }: HttpContext) {
    const { queue, ref } = await request.validateUsing(ackValidator)
    await new AdminQueueService().acknowledge(queue, ref, auth.getUserOrFail().id)
    session.flash('success', 'Marked as handled.')
    return response.redirect().toPath('/admin/queues')
  }

  async decideMaker({ params, request, response, session, auth }: HttpContext) {
    const { decision } = await request.validateUsing(makerValidator)
    await new AdminQueueService().decideMaker(Number(params.id), decision, auth.getUserOrFail().id)
    session.flash('success', decision === 'approve' ? 'Maker approved.' : 'Maker rejected.')
    return response.redirect().toPath('/admin/queues')
  }

  async bulk({ request, response, session, auth }: HttpContext) {
    const { action, refs } = await request.validateUsing(bulkValidator)
    const { failed } = await new AdminQueueService().bulk(action, refs, auth.getUserOrFail().id)
    session.flash(
      failed > 0 ? 'error' : 'success',
      failed > 0
        ? 'Some items could not be changed; they may already have been handled.'
        : 'Done for all selected items.'
    )
    return response.redirect().toPath('/admin/queues')
  }
}
