import { DateTime } from 'luxon'
import Rfq from '#models/rfq'
import RfqBid from '#models/rfq_bid'
import ManufacturerProfile from '#models/manufacturer_profile'
import NotificationService from '#services/notifications/notification_service'
import { maskContactDetails } from '#services/messaging/contact_filter'
import RfqInviteService from '#services/rfq/rfq_invite_service'
import { RfqError } from '#services/rfq/rfq_service'

export interface BidInput {
  unitPriceMinor: number
  leadDays: number
  note?: string | null
}

export default class RfqBidService {
  private invites = new RfqInviteService()

  /** A maker's own bid on an RFQ they were invited to; sending again replaces the earlier one. */
  async submit(rfqId: number, manufacturerProfileId: number, input: BidInput): Promise<RfqBid> {
    const rfq = await Rfq.find(rfqId)
    if (!rfq || !(await this.invites.isInvited(rfq.id, manufacturerProfileId))) {
      throw new RfqError('Request not found')
    }
    if (rfq.status !== 'open' || rfq.bidsCloseAt <= DateTime.now()) {
      throw new RfqError('Bidding on this request has closed')
    }
    if (
      !Number.isInteger(input.unitPriceMinor) ||
      input.unitPriceMinor < 1 ||
      input.unitPriceMinor > 10_000_000
    ) {
      throw new RfqError('Enter a price per unit')
    }
    if (
      !Number.isInteger(input.leadDays) ||
      input.leadDays < 1 ||
      input.leadDays > rfq.maxLeadDays
    ) {
      throw new RfqError(`Delivery must be within ${rfq.maxLeadDays} days as requested`)
    }
    // no phone numbers, e-mail addresses or links: the platform keeps both sides apart until an order exists
    const note = input.note?.trim()
      ? maskContactDetails(input.note.trim().slice(0, 300)).text
      : null

    const existing = await RfqBid.query()
      .where('rfqId', rfq.id)
      .where('manufacturerProfileId', manufacturerProfileId)
      .first()
    if (existing) {
      if (existing.status === 'won' || existing.status === 'lost') {
        throw new RfqError('This offer can no longer be changed')
      }
      existing.unitPriceMinor = input.unitPriceMinor
      existing.leadDays = input.leadDays
      existing.note = note
      existing.status = 'active'
      await existing.save()
      return existing
    }

    const bid = await RfqBid.create({
      rfqId: rfq.id,
      manufacturerProfileId,
      unitPriceMinor: input.unitPriceMinor,
      leadDays: input.leadDays,
      note,
      status: 'active',
    })
    await new NotificationService().notify({
      userId: rfq.buyerId,
      type: 'rfq_bid_received',
      role: 'buyer',
      context: { rfqCode: rfq.code, rfqId: rfq.id },
      eventKey: `rfq_bid:${rfq.id}:${bid.id}`,
    })
    return bid
  }

  async withdraw(rfqId: number, manufacturerProfileId: number): Promise<void> {
    const rfq = await Rfq.find(rfqId)
    const bid = await RfqBid.query()
      .where('rfqId', rfqId)
      .where('manufacturerProfileId', manufacturerProfileId)
      .where('status', 'active')
      .first()
    if (!rfq || !bid) throw new RfqError('Offer not found')
    if (rfq.status !== 'open' && rfq.status !== 'closed') {
      throw new RfqError('This request has ended')
    }
    bid.status = 'withdrawn'
    await bid.save()
  }

  /** Requests a maker was invited to, newest first, with their own bid if any. */
  async listForMaker(manufacturerProfileId: number) {
    const profile = await ManufacturerProfile.findOrFail(manufacturerProfileId)
    const rfqs = await Rfq.query()
      .whereIn('id', (q) => {
        q.from('rfq_invites').select('rfq_id').where('manufacturer_profile_id', profile.id)
      })
      .orderBy('id', 'desc')
      .limit(100)
    const bids = await RfqBid.query()
      .where('manufacturerProfileId', profile.id)
      .whereIn(
        'rfqId',
        rfqs.map((r) => r.id)
      )
    const byRfq = new Map(bids.map((b) => [b.rfqId, b]))
    return rfqs.map((rfq) => ({ rfq, bid: byRfq.get(rfq.id) ?? null }))
  }
}
