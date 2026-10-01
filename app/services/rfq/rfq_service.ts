import { randomBytes } from 'node:crypto'
import DomainError from '#exceptions/domain_error'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import AuditLog from '#models/audit_log'
import Material from '#models/material'
import ModelFile from '#models/model_file'
import Order from '#models/order'
import OrderItem from '#models/order_item'
import Rfq from '#models/rfq'
import RfqBid from '#models/rfq_bid'
import SellerProfile from '#models/seller_profile'
import type { PrinterTechnology } from '#models/printer'
import type User from '#models/user'
import EncryptionService from '#services/identity/encryption_service'
import { generateOrderCode, type ShippingAddress } from '#services/orders/order_service'
import NotificationService from '#services/notifications/notification_service'
import { requiredTierForTotal } from '#services/manufacturing/trust_tier_service'
import RfqInviteService from '#services/rfq/rfq_invite_service'
import { priceAwardedBid } from '#services/rfq/rfq_pricing'

export class RfqError extends DomainError {}

export const MAX_OPEN_RFQS = 10
export const MAX_QUANTITY = 5000
/** Bids open for at most this many days; a buyer who takes longer than the grace period loses the RFQ. */
export const MAX_BID_DAYS = 14
export const AWARD_GRACE_DAYS = 14

export interface CreateRfqInput {
  modelFileId: string
  title: string
  material: string
  color?: string | null
  quantity: number
  shipCountry: string
  bidDays: number
  maxLeadDays: number
  requiredTrustTier?: number
}

function rfqCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'RQ-'
  for (const b of randomBytes(8)) code += alphabet[b % alphabet.length]
  return code
}

export default class RfqService {
  private notifications = new NotificationService()

  /** Only a corporate seller account may open an RFQ (PRD §4). */
  async assertCorporate(user: User): Promise<void> {
    const profile = await SellerProfile.query().where('userId', user.id).first()
    if (!profile || !profile.isCorporate) {
      throw new RfqError('Requests for quotes are for corporate accounts')
    }
  }

  async create(buyer: User, input: CreateRfqInput): Promise<Rfq> {
    await this.assertCorporate(buyer)
    if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > MAX_QUANTITY) {
      throw new RfqError(`Quantity must be between 1 and ${MAX_QUANTITY}`)
    }
    if (!Number.isInteger(input.bidDays) || input.bidDays < 1 || input.bidDays > MAX_BID_DAYS) {
      throw new RfqError(`Bids can stay open for 1 to ${MAX_BID_DAYS} days`)
    }
    if (!Number.isInteger(input.maxLeadDays) || input.maxLeadDays < 1 || input.maxLeadDays > 90) {
      throw new RfqError('The delivery time must be between 1 and 90 days')
    }
    const tier = input.requiredTrustTier ?? 0
    if (!Number.isInteger(tier) || tier < 0 || tier > 2) {
      throw new RfqError('The trust level must be between 0 and 2')
    }

    const file = await ModelFile.query()
      .where('id', input.modelFileId)
      .where('ownerId', buyer.id)
      .first()
    if (!file || file.analysisStatus !== 'done' || !file.volumeMm3) {
      throw new RfqError('Model file not found or not analyzed yet')
    }
    if (file.blockedAt || file.isPrintable === false) {
      throw new RfqError('This model cannot be printed')
    }
    const material = await Material.query()
      .whereRaw('upper(code) = ?', [input.material.toUpperCase()])
      .where('isActive', true)
      .first()
    if (!material) throw new RfqError(`Unknown material: ${input.material}`)

    const open = await Rfq.query().where('buyerId', buyer.id).whereIn('status', ['open', 'closed'])
    if (open.length >= MAX_OPEN_RFQS) {
      throw new RfqError(`You can have at most ${MAX_OPEN_RFQS} open requests`)
    }

    const rfq = await Rfq.create({
      code: rfqCode(),
      buyerId: buyer.id,
      modelFileId: file.id,
      title: input.title.trim(),
      material: material.code,
      color: input.color?.trim() || null,
      technology: material.technology,
      quantity: input.quantity,
      shipCountry: input.shipCountry.toUpperCase(),
      bidsCloseAt: DateTime.now().plus({ days: input.bidDays }),
      maxLeadDays: input.maxLeadDays,
      requiredTrustTier: tier,
      status: 'open',
    })

    const invited = await new RfqInviteService().invite(rfq)
    for (const maker of invited) {
      await this.notifications.notify({
        userId: maker.userId,
        type: 'rfq_invited',
        role: 'maker',
        context: { rfqCode: rfq.code, rfqId: rfq.id },
        eventKey: `rfq_invited:${rfq.id}`,
      })
    }
    return rfq
  }

  async findForBuyer(id: string, buyerId: string): Promise<Rfq | null> {
    return Rfq.query().where('id', id).where('buyerId', buyerId).first()
  }

  async listForBuyer(buyerId: string) {
    return Rfq.query().where('buyerId', buyerId).orderBy('id', 'desc').limit(100)
  }

  async cancel(rfqId: string, buyerId: string): Promise<void> {
    await db.transaction(async (trx) => {
      const rfq = await Rfq.query({ client: trx })
        .where('id', rfqId)
        .where('buyerId', buyerId)
        .forUpdate()
        .first()
      if (!rfq) throw new RfqError('Request not found')
      if (rfq.status !== 'open' && rfq.status !== 'closed') {
        throw new RfqError('This request can no longer be cancelled')
      }
      rfq.status = 'cancelled'
      await rfq.useTransaction(trx).save()
      await RfqBid.query({ client: trx }).where('rfqId', rfq.id).where('status', 'active').update({
        status: 'lost',
      })
    })
  }

  /**
   * The buyer picks a bid. That creates one ordinary order at the bid's price, addressed to the
   * winning maker only: the buyer pays it like any other order and the winner then gets the job as
   * an offer (they still have to accept it, and can decline). Every other bid is closed.
   */
  async award(
    rfqId: string,
    buyer: User,
    bidId: string,
    address: ShippingAddress
  ): Promise<{ rfq: Rfq; order: Order }> {
    const result = await db.transaction(async (trx) => {
      const rfq = await Rfq.query({ client: trx })
        .where('id', rfqId)
        .where('buyerId', buyer.id)
        .forUpdate()
        .first()
      if (!rfq) throw new RfqError('Request not found')
      if (rfq.status !== 'open' && rfq.status !== 'closed') {
        throw new RfqError('This request has already been decided or has ended')
      }
      const bid = await RfqBid.query({ client: trx })
        .where('id', bidId)
        .where('rfqId', rfq.id)
        .where('status', 'active')
        .first()
      if (!bid) throw new RfqError('That offer is no longer available')
      // makers were invited and bid for this country; an order elsewhere could never be matched
      if (address.country.toUpperCase() !== rfq.shipCountry.toUpperCase()) {
        throw new RfqError(`The delivery address must be in ${rfq.shipCountry.toUpperCase()}`)
      }

      const file = await ModelFile.findOrFail(rfq.modelFileId, { client: trx })
      const price = await priceAwardedBid({
        file,
        material: rfq.material,
        quantity: rfq.quantity,
        unitShareMinor: bid.unitPriceMinor,
        country: address.country,
      })

      const order = await Order.create(
        {
          code: generateOrderCode(),
          channel: 'rfq',
          buyerId: buyer.id,
          sellerId: null,
          status: 'draft',
          currency: price.currency,
          subtotalMinor: price.subtotalMinor,
          shippingMinor: price.shippingMinor,
          totalMinor: price.totalMinor,
          discountMinor: 0,
          baseTotalMinor: price.totalMinor,
          taxRateBps: price.taxRateBps,
          taxMinor: price.taxMinor,
          platformFeeMinor: price.platformFeeMinor,
          sellerShareMinor: 0,
          shippingAddressEnc: new EncryptionService().encrypt(JSON.stringify(address)),
          shipCountry: address.country.toUpperCase(),
          requiredTrustTier: Math.max(
            rfq.requiredTrustTier,
            requiredTierForTotal(price.totalMinor)
          ),
          matchingRound: 0,
        },
        { client: trx }
      )
      await OrderItem.create(
        {
          orderId: order.id,
          modelFileId: file.id,
          technology: rfq.technology as PrinterTechnology,
          scalePercent: 100,
          material: rfq.material,
          color: rfq.color,
          quantity: rfq.quantity,
          estGrams: price.estGrams,
          estPrintMinutes: price.estPrintMinutes,
          unitCostMinor: price.unitPriceMinor,
          manufacturerShareMinor: price.unitShareMinor,
        },
        { client: trx }
      )

      bid.status = 'won'
      await bid.useTransaction(trx).save()
      await RfqBid.query({ client: trx })
        .where('rfqId', rfq.id)
        .whereNot('id', bid.id)
        .where('status', 'active')
        .update({ status: 'lost' })
      rfq.status = 'awarded'
      rfq.awardedBidId = bid.id
      rfq.orderId = order.id
      await rfq.useTransaction(trx).save()

      await AuditLog.create(
        {
          actorId: buyer.id,
          action: 'rfq.awarded',
          subjectType: 'rfq',
          subjectId: rfq.id,
          meta: { bidId: bid.id, orderId: order.id },
        },
        { client: trx }
      )
      return { rfq, order, bid }
    })

    const winner = await db
      .from('manufacturer_profiles')
      .where('id', result.bid.manufacturerProfileId)
      .select('user_id')
      .first()
    if (winner) {
      await this.notifications.notify({
        userId: winner.user_id,
        type: 'rfq_awarded',
        role: 'maker',
        context: { rfqCode: result.rfq.code, rfqId: result.rfq.id },
        eventKey: `rfq_awarded:${result.rfq.id}`,
      })
    }
    return { rfq: result.rfq, order: result.order }
  }

  /**
   * Sweep (idempotent): bids close at their deadline (no bids → the request expires), and a request
   * nobody was chosen for within the grace period expires too.
   */
  async closeDue(now: DateTime = DateTime.now()): Promise<{ closed: number; expired: number }> {
    let closed = 0
    let expired = 0
    // each row is re-read under a lock: an award committed meanwhile must not be overwritten
    const due = await Rfq.query().where('status', 'open').where('bidsCloseAt', '<=', now.toSQL()!)
    for (const { id } of due) {
      const outcome = await db.transaction(async (trx) => {
        const rfq = await Rfq.query({ client: trx }).where('id', id).forUpdate().firstOrFail()
        if (rfq.status !== 'open') return null
        const bids = await RfqBid.query({ client: trx })
          .where('rfqId', rfq.id)
          .where('status', 'active')
        rfq.status = bids.length > 0 ? 'closed' : 'expired'
        await rfq.useTransaction(trx).save()
        return rfq.status
      })
      if (outcome === 'closed') closed++
      else if (outcome === 'expired') expired++
    }
    const stale = await Rfq.query()
      .where('status', 'closed')
      .where('bidsCloseAt', '<=', now.minus({ days: AWARD_GRACE_DAYS }).toSQL()!)
    for (const { id } of stale) {
      const done = await db.transaction(async (trx) => {
        const rfq = await Rfq.query({ client: trx }).where('id', id).forUpdate().firstOrFail()
        if (rfq.status !== 'closed') return false
        rfq.status = 'expired'
        await rfq.useTransaction(trx).save()
        await RfqBid.query({ client: trx })
          .where('rfqId', rfq.id)
          .where('status', 'active')
          .update({ status: 'lost' })
        return true
      })
      if (done) expired++
    }
    return { closed, expired }
  }
}
