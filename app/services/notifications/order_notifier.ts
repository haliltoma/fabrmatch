import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'
import Order from '#models/order'
import type Payout from '#models/payout'
import Dispute from '#models/dispute'
import ProductionJob from '#models/production_job'
import ManufacturerProfile from '#models/manufacturer_profile'
import type MatchOffer from '#models/match_offer'
import NotificationService from '#services/notifications/notification_service'
import type {
  NotificationContext,
  NotificationRole,
  NotificationType,
} from '#services/notifications/catalog'

interface Parties {
  order: Order
  buyerId: number
  sellerId: number | null
  makerUserId: number | null
  jobId: number | null
}

/**
 * Turns domain events into notifications for the right people. Call AFTER the transaction that
 * caused the event has committed. Every method swallows its own errors (logged): a failed
 * notification never fails the business action.
 */
export default class OrderNotifier {
  constructor(private notifications = new NotificationService()) {}

  private async parties(orderId: number): Promise<Parties> {
    const order = await Order.findOrFail(orderId)
    const job = await ProductionJob.query()
      .where('orderId', orderId)
      .whereNot('status', 'cancelled')
      .orderBy('id', 'desc')
      .first()
    let makerUserId: number | null = null
    if (job) {
      const profile = await ManufacturerProfile.find(job.manufacturerProfileId)
      makerUserId = profile?.userId ?? null
    }
    return {
      order,
      buyerId: order.buyerId,
      sellerId: order.sellerId,
      makerUserId,
      jobId: job?.id ?? null,
    }
  }

  private async adminIds(): Promise<number[]> {
    const rows = await db.from('user_roles').where('role', 'admin').select('user_id')
    return rows.map((r: { user_id: number }) => r.user_id)
  }

  private async send(
    userId: number | null,
    role: NotificationRole,
    type: NotificationType,
    context: NotificationContext,
    eventKey: string
  ) {
    if (!userId) return
    await this.notifications.notify({
      userId,
      role,
      type,
      context,
      eventKey: `${type}:${eventKey}`,
    })
  }

  private async safely(label: string, fn: () => Promise<void>) {
    try {
      await fn()
    } catch (error) {
      logger.error({ msg: `notification ${label} failed`, error: (error as Error).message })
    }
  }

  paymentReceived(orderId: number) {
    return this.safely('payment_received', async () => {
      const p = await this.parties(orderId)
      const ctx = { code: p.order.code, orderId }
      await this.send(p.buyerId, 'buyer', 'payment_received', ctx, `${orderId}`)
    })
  }

  offerReceived(offer: MatchOffer, ttlMinutes: number) {
    return this.safely('offer_received', async () => {
      const profile = await ManufacturerProfile.findOrFail(offer.manufacturerProfileId)
      await this.send(
        profile.userId,
        'maker',
        'offer_received',
        { alias: profile.publicAlias, ttlMinutes },
        `${offer.id}`
      )
    })
  }

  unmatched(orderId: number) {
    return this.safely('order_unmatched', async () => {
      const p = await this.parties(orderId)
      await this.send(
        p.buyerId,
        'buyer',
        'order_unmatched',
        { code: p.order.code, orderId },
        `${orderId}:${p.order.matchingRound}`
      )
    })
  }

  inProduction(orderId: number) {
    return this.safely('order_in_production', async () => {
      const p = await this.parties(orderId)
      const ctx = { code: p.order.code, orderId }
      const key = `${p.jobId ?? orderId}`
      await this.send(p.buyerId, 'buyer', 'order_in_production', ctx, key)
      await this.send(p.sellerId, 'seller', 'order_in_production', ctx, key)
    })
  }

  shipped(orderId: number) {
    return this.safely('order_shipped', async () => {
      const p = await this.parties(orderId)
      const job = p.jobId ? await ProductionJob.find(p.jobId) : null
      const base = { code: p.order.code, orderId }
      const key = `${p.jobId ?? orderId}`
      // tracking number goes to the buyer only
      await this.send(
        p.buyerId,
        'buyer',
        'order_shipped',
        { ...base, carrier: job?.carrier, trackingNumber: job?.trackingNumber },
        key
      )
      await this.send(p.sellerId, 'seller', 'order_shipped', base, key)
    })
  }

  delivered(orderId: number) {
    return this.safely('order_delivered', async () => {
      const p = await this.parties(orderId)
      const ctx = { code: p.order.code, orderId }
      await this.send(p.buyerId, 'buyer', 'order_delivered', ctx, `${orderId}`)
      await this.send(p.makerUserId, 'maker', 'order_delivered', ctx, `${orderId}`)
    })
  }

  completed(orderId: number) {
    return this.safely('order_completed', async () => {
      const p = await this.parties(orderId)
      const ctx = { code: p.order.code, orderId }
      await this.send(p.makerUserId, 'maker', 'order_completed', ctx, `${orderId}`)
      await this.send(p.sellerId, 'seller', 'order_completed', ctx, `${orderId}`)
    })
  }

  cancelled(orderId: number) {
    return this.safely('order_cancelled', async () => {
      const p = await this.parties(orderId)
      await this.send(
        p.buyerId,
        'buyer',
        'order_cancelled',
        { code: p.order.code, orderId },
        `${orderId}`
      )
    })
  }

  refundIssued(orderId: number, amountMinor: number, refundedTotalMinor: number) {
    return this.safely('refund_issued', async () => {
      const p = await this.parties(orderId)
      await this.send(
        p.buyerId,
        'buyer',
        'refund_issued',
        { code: p.order.code, orderId, amountMinor, currency: p.order.currency },
        `${orderId}:${refundedTotalMinor}`
      )
    })
  }

  payoutPaid(payout: Payout) {
    return this.safely('payout_paid', async () => {
      const order = await Order.findOrFail(payout.orderId)
      const ctx = {
        code: order.code,
        orderId: order.id,
        amountMinor: payout.amountMinor,
        currency: payout.currency,
      }
      if (payout.beneficiaryType === 'seller') {
        await this.send(payout.beneficiaryId, 'seller', 'payout_paid', ctx, `${payout.id}`)
      } else {
        const profile = await ManufacturerProfile.find(payout.beneficiaryId)
        await this.send(profile?.userId ?? null, 'maker', 'payout_paid', ctx, `${payout.id}`)
      }
    })
  }

  /** Tax details reviewed, invoice needed / reviewed (R7). `beneficiaryId` as on payouts. */
  payoutAction(
    beneficiaryType: 'manufacturer' | 'seller',
    beneficiaryId: number,
    context: NotificationContext & { step: NonNullable<NotificationContext['step']> },
    eventKey: string
  ) {
    return this.safely('payout_action', async () => {
      if (beneficiaryType === 'seller') {
        await this.send(beneficiaryId, 'seller', 'payout_action', context, eventKey)
      } else {
        const profile = await ManufacturerProfile.find(beneficiaryId)
        await this.send(profile?.userId ?? null, 'maker', 'payout_action', context, eventKey)
      }
    })
  }

  disputeOpened(disputeId: number) {
    return this.safely('dispute_opened', async () => {
      const dispute = await Dispute.findOrFail(disputeId)
      const p = await this.parties(dispute.orderId)
      const ctx = { code: p.order.code, orderId: p.order.id, disputeId }
      await this.send(p.makerUserId, 'maker', 'dispute_opened', ctx, `${disputeId}`)
      await this.send(p.sellerId, 'seller', 'dispute_opened', ctx, `${disputeId}`)
      for (const adminId of await this.adminIds()) {
        await this.send(adminId, 'admin', 'dispute_opened', ctx, `${disputeId}`)
      }
    })
  }

  disputeResponded(disputeId: number) {
    return this.safely('dispute_responded', async () => {
      const dispute = await Dispute.findOrFail(disputeId)
      const p = await this.parties(dispute.orderId)
      const ctx = { code: p.order.code, orderId: p.order.id, disputeId }
      await this.send(p.buyerId, 'buyer', 'dispute_responded', ctx, `${disputeId}`)
      for (const adminId of await this.adminIds()) {
        await this.send(adminId, 'admin', 'dispute_responded', ctx, `${disputeId}`)
      }
    })
  }

  disputeResolved(disputeId: number) {
    return this.safely('dispute_resolved', async () => {
      const dispute = await Dispute.findOrFail(disputeId)
      const p = await this.parties(dispute.orderId)
      const ctx = {
        code: p.order.code,
        orderId: p.order.id,
        disputeId,
        resolution: dispute.resolution,
        amountMinor: dispute.refundMinor,
        currency: p.order.currency,
      }
      await this.send(p.buyerId, 'buyer', 'dispute_resolved', ctx, `${disputeId}`)
      await this.send(p.makerUserId, 'maker', 'dispute_resolved', ctx, `${disputeId}`)
      await this.send(p.sellerId, 'seller', 'dispute_resolved', ctx, `${disputeId}`)
    })
  }
}
