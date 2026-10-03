import DomainError from '#exceptions/domain_error'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import transmit from '@adonisjs/transmit/services/main'
import { DateTime } from 'luxon'
import fabrmatchConfig from '#config/fabrmatch'
import AuditLog from '#models/audit_log'
import MatchOffer from '#models/match_offer'
import Order from '#models/order'
import OrderItem from '#models/order_item'
import OfferRevision, { MAX_REVISIONS } from '#models/offer_revision'
import { offersChannel } from '#services/matching/matching_effects'
import ContentModerator from '#services/messaging/content_moderator'
import OrderNotifier from '#services/notifications/order_notifier'
import { resolveColours } from '#services/orders/order_pricing'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export class RevisionError extends DomainError {}

export { MAX_REVISIONS }
const MAX_TEXT = 1000

/** What the buyer may change in an answer: details that do not change the price. */
export interface RevisionAnswer {
  response: string
  items?: Array<{
    itemId: string
    colours?: Array<{ name: string; part?: string | null }>
    buyerNote?: string | null
  }>
}

/**
 * Paket Y: before accepting, a maker can ask the buyer for a change ("the head cannot be clear
 * PETG, may it be white?"). The offer waits with that maker while the buyer answers; the answer may
 * change colours, part names and the note, never the price (a priced change = cancel with a full
 * refund and a new order). Both texts are moderated: neither side may say who they are.
 */
export default class OfferRevisionService {
  constructor(
    private moderator = new ContentModerator(),
    private notifier = new OrderNotifier()
  ) {}

  async request(
    offerId: string,
    manufacturerProfileId: string,
    body: string,
    actorId: string
  ): Promise<OfferRevision> {
    const text = this.cleanText(body, 'Write what you need from the buyer')
    const offer = await MatchOffer.find(offerId)
    if (!offer || offer.manufacturerProfileId !== manufacturerProfileId) {
      throw new RevisionError('Offer not found')
    }
    await this.moderator.enforce([text], {
      userId: actorId,
      orderId: offer.orderId,
      context: 'revision_request',
    })

    const revision = await db.transaction(async (trx) => {
      const locked = await MatchOffer.query({ client: trx })
        .where('id', offerId)
        .forUpdate()
        .first()
      if (!locked || locked.status !== 'pending') {
        throw new RevisionError('Offer is no longer pending')
      }
      if (locked.expiresAt <= DateTime.now()) throw new RevisionError('Offer has expired')
      const asked = await OfferRevision.query({ client: trx })
        .where('matchOfferId', offerId)
        .count('* as n')
        .first()
      if (Number(asked?.$extras.n ?? 0) >= MAX_REVISIONS) {
        throw new RevisionError(
          `You have asked ${MAX_REVISIONS} times on this offer; accept or decline it now`
        )
      }
      const created = await OfferRevision.create(
        { matchOfferId: offerId, orderId: locked.orderId, requestBody: text, status: 'open' },
        { client: trx }
      )
      locked.status = 'revision'
      locked.respondedAt = DateTime.now()
      locked.expiresAt = DateTime.now().plus({
        minutes: fabrmatchConfig.matching.revisionTtlMinutes,
      })
      await locked.useTransaction(trx).save()
      await this.audit(trx, 'match.revision_requested', locked.orderId, actorId, {
        offerId,
        revisionId: created.id,
      })
      return created
    })

    await this.scheduleExpiry(offerId, fabrmatchConfig.matching.revisionTtlMinutes)
    await this.notifier.revisionRequested(revision.orderId, revision.id)
    return revision
  }

  /** The buyer answers; the offer goes back to the same maker with a fresh offer window. */
  async answer(orderId: string, buyerId: string, answer: RevisionAnswer): Promise<OfferRevision> {
    const response = this.cleanText(answer.response, 'Write an answer for the maker')
    const order = await Order.find(orderId)
    if (!order || order.buyerId !== buyerId) throw new RevisionError('Order not found')
    await this.moderator.enforce(
      [
        response,
        ...(answer.items ?? []).flatMap((i) => [
          i.buyerNote,
          ...(i.colours ?? []).map((c) => c.part),
        ]),
      ],
      { userId: buyerId, orderId, context: 'revision_response' }
    )

    const { revision, offer } = await db.transaction(async (trx) => {
      const offerRow = await MatchOffer.query({ client: trx })
        .where('orderId', orderId)
        .where('status', 'revision')
        .forUpdate()
        .first()
      if (!offerRow) throw new RevisionError('There is no question to answer on this order')
      if (offerRow.expiresAt <= DateTime.now()) {
        throw new RevisionError('The time to answer has run out; the order went to another maker')
      }
      const open = await OfferRevision.query({ client: trx })
        .where('matchOfferId', offerRow.id)
        .where('status', 'open')
        .forUpdate()
        .firstOrFail()

      for (const change of answer.items ?? []) {
        await this.applyChange(orderId, change, trx)
      }

      open.status = 'answered'
      open.responseBody = response
      open.answeredAt = DateTime.now()
      await open.useTransaction(trx).save()
      offerRow.status = 'pending'
      offerRow.expiresAt = DateTime.now().plus({
        minutes: fabrmatchConfig.matching.offerTtlMinutes,
      })
      await offerRow.useTransaction(trx).save()
      await this.audit(trx, 'match.revision_answered', orderId, buyerId, {
        offerId: offerRow.id,
        revisionId: open.id,
        changedItems: (answer.items ?? []).map((i) => i.itemId),
      })
      return { revision: open, offer: offerRow }
    })

    await this.scheduleExpiry(offer.id, fabrmatchConfig.matching.offerTtlMinutes)
    try {
      transmit.broadcast(offersChannel(offer.manufacturerProfileId), {
        type: 'offer.revised',
        offerId: offer.id,
        expiresAt: offer.expiresAt.toISO(),
      })
    } catch (error) {
      logger.error({ msg: 'revision broadcast failed', error: (error as Error).message })
    }
    await this.notifier.revisionAnswered(offer, revision.id)
    return revision
  }

  /** Questions and answers on one offer, oldest first (the maker's card and the buyer's page). */
  async forOffer(offerId: string) {
    const rows = await OfferRevision.query().where('matchOfferId', offerId).orderBy('id', 'asc')
    return rows.map((r) => this.toView(r))
  }

  /** The open question on an order, for the buyer; null when nothing waits for them. */
  async openForOrder(orderId: string) {
    const offer = await MatchOffer.query()
      .where('orderId', orderId)
      .where('status', 'revision')
      .where('expiresAt', '>', DateTime.now().toSQL()!)
      .first()
    if (!offer) return null
    const history = await this.forOffer(offer.id)
    return { expiresAt: offer.expiresAt.toISO()!, history }
  }

  private toView(r: OfferRevision) {
    return {
      id: r.id,
      status: r.status,
      request: r.requestBody,
      response: r.responseBody,
      askedAt: r.createdAt.toISO()!,
      answeredAt: r.answeredAt?.toISO() ?? null,
    }
  }

  private async applyChange(
    orderId: string,
    change: NonNullable<RevisionAnswer['items']>[number],
    trx: TransactionClientContract
  ) {
    const item = await OrderItem.query({ client: trx })
      .where('id', change.itemId)
      .where('orderId', orderId)
      .forUpdate()
      .first()
    if (!item) throw new RevisionError('That part of the order was not found')
    if (change.colours) {
      const colours = await resolveColours({ colours: change.colours })
      // the extra-colour fee is in the price: the count stays, the colours may change
      if (colours.length !== Math.max(item.colours.length, 1)) {
        throw new RevisionError(
          'Changing how many colours changes the price. Cancel for a full refund and order again.'
        )
      }
      item.colours = colours
      item.color = colours[0]?.name.toLowerCase() ?? null
    }
    if (change.buyerNote !== undefined) item.buyerNote = change.buyerNote?.trim() || null
    await item.useTransaction(trx).save()
  }

  private cleanText(body: string, emptyMessage: string): string {
    const text = (body ?? '').trim()
    if (text.length === 0) throw new RevisionError(emptyMessage)
    if (text.length > MAX_TEXT) throw new RevisionError(`Keep it under ${MAX_TEXT} characters`)
    return text
  }

  private async scheduleExpiry(offerId: string, minutes: number) {
    try {
      const { default: ExpireOffer } = await import('#jobs/expire_offer')
      await ExpireOffer.dispatch({ offerId }).in(`${minutes}m`)
    } catch (error) {
      // the ExpireStaleOffers sweep catches it if this job is lost
      logger.error({
        msg: 'schedule offer expiry failed',
        offerId,
        error: (error as Error).message,
      })
    }
  }

  private async audit(
    trx: TransactionClientContract,
    action: string,
    orderId: string,
    actorId: string | null,
    meta: Record<string, unknown>
  ) {
    await AuditLog.create(
      { actorId, action, subjectType: 'order', subjectId: orderId, meta },
      { client: trx }
    )
  }
}
