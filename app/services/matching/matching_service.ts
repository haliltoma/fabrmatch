import DomainError from '#exceptions/domain_error'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import fabrmatchConfig from '#config/fabrmatch'
import Order from '#models/order'
import MatchOffer from '#models/match_offer'
import ProductionJob from '#models/production_job'
import ManufacturerProfile from '#models/manufacturer_profile'
import AuditLog from '#models/audit_log'
import OrderStateMachine from '#services/orders/order_state_machine'
import OrderService from '#services/orders/order_service'
import EligibilityService from '#services/matching/eligibility_service'
import EligibilityExplainer, { isHardBlocker } from '#services/matching/eligibility_explainer'
import Printer from '#models/printer'
import CapacitySlot from '#models/capacity_slot'
import { rankCandidates } from '#services/matching/ranking'
import type { Rng } from '#services/matching/types'
import CapacityService from '#services/manufacturing/capacity_service'
import { productionDaysFor } from '#services/orders/production_window'
import FileAccessService from '#services/files/file_access_service'
import type { MatchingEffects } from '#services/matching/matching_effects'
import QueueMatchingEffects from '#services/matching/matching_effects'

export class OfferError extends DomainError {}

type RoundOutcome =
  | { kind: 'noop' }
  | { kind: 'offer'; offer: MatchOffer }
  | { kind: 'unmatched'; orderId: number; reason: string }

export default class MatchingService {
  private sm = new OrderStateMachine()
  private eligibility = new EligibilityService()
  private orders = new OrderService()
  private capacity = new CapacityService()
  private fileAccess = new FileAccessService()

  constructor(
    private effects: MatchingEffects = new QueueMatchingEffects(),
    private rng: Rng = Math.random
  ) {}

  /** paid → matching, then first round. */
  async start(orderId: number, actorId: number | null = null): Promise<MatchOffer | null> {
    await this.sm.transition(orderId, 'matching', { actorId })
    return this.runRound(orderId)
  }

  /** After automatic matching is switched on: a round for every order still waiting for a maker. */
  async resumeWaiting(): Promise<number> {
    const waiting = await Order.query().where('status', 'matching').select('id')
    let started = 0
    for (const { id } of waiting) {
      if (await this.runRound(id)) started++
    }
    return started
  }

  /**
   * Admin re-match of an `unmatched` order (e.g. after approving new makers): resets the round
   * counter and starts again. Makers that already declined or expired stay excluded.
   */
  async restart(orderId: number, adminId: number): Promise<MatchOffer | null> {
    await db.transaction(async (trx) => {
      const order = await Order.query({ client: trx }).where('id', orderId).forUpdate().first()
      if (!order || order.status !== 'unmatched') {
        throw new OfferError('Only an unmatched order can be re-matched')
      }
      order.matchingRound = 0
      await order.useTransaction(trx).save()
      await this.sm.transition(orderId, 'matching', {
        trx,
        actorId: adminId,
        meta: { by: 'admin_rematch' },
      })
    })
    return this.runRound(orderId)
  }

  /** Off = paid orders wait in /admin/matching until an admin picks the maker. */
  static autoOffer(): boolean {
    return fabrmatchConfig.matching.autoOffer === 1
  }

  /**
   * Idempotent: does nothing unless the order is `matching` and has no pending offer.
   * After `maxRounds` offers (or with no eligible candidates left) the order becomes `unmatched`.
   * With automatic matching off it does nothing: the order waits for an admin (`offerTo`).
   */
  async runRound(orderId: number): Promise<MatchOffer | null> {
    const cfg = fabrmatchConfig.matching
    if (!MatchingService.autoOffer()) return null

    const outcome = await db.transaction(async (trx): Promise<RoundOutcome> => {
      const order = await Order.query({ client: trx }).where('id', orderId).forUpdate().first()
      if (!order || order.status !== 'matching') return { kind: 'noop' }

      const pending = await MatchOffer.query({ client: trx })
        .where('orderId', orderId)
        .where('status', 'pending')
        .first()
      if (pending) return { kind: 'noop' }

      if (order.matchingRound >= cfg.maxRounds) {
        return this.markUnmatched(order.id, 'max_rounds', trx)
      }

      const previous = await MatchOffer.query({ client: trx })
        .where('orderId', orderId)
        .select('manufacturerProfileId')
      const candidates = await this.eligibility.findCandidates(order, {
        excludeManufacturerIds: previous.map((o) => o.manufacturerProfileId),
        buyerCity: this.orders.decryptShippingAddress(order)?.city ?? null,
      })

      const { selection } = rankCandidates(candidates, this.rng, cfg)
      if (!selection) {
        return this.markUnmatched(order.id, 'no_candidates', trx)
      }

      order.matchingRound += 1
      await order.useTransaction(trx).save()

      const offer = await MatchOffer.create(
        {
          orderId: order.id,
          manufacturerProfileId: selection.candidate.manufacturerProfileId,
          printerId: selection.candidate.printerId,
          slotDate: DateTime.fromISO(selection.candidate.slotDate),
          round: order.matchingRound,
          score: selection.candidate.score,
          isExploration: selection.isExploration,
          status: 'pending',
          expiresAt: DateTime.now().plus({ minutes: cfg.offerTtlMinutes }),
        },
        { client: trx }
      )

      await this.audit(trx, 'match.offer_created', order.id, {
        offerId: offer.id,
        round: offer.round,
        isExploration: offer.isExploration,
        score: offer.score,
        candidateCount: candidates.length,
      })

      return { kind: 'offer', offer }
    })

    if (outcome.kind === 'offer') {
      await this.effects.offerCreated(outcome.offer)
      return outcome.offer
    }
    if (outcome.kind === 'unmatched') {
      await this.effects.orderUnmatched(outcome.orderId, outcome.reason)
    }
    return null
  }

  /**
   * Admin match: send the offer to the maker the admin picked. A maker who passes every rule gets
   * a normal offer. With `allowOverride` (manual mode) the admin may also pick a maker who fails
   * some rules — the unmet rules are recorded in the audit log and the offer is flagged
   * `adminOverride`, so it can be accepted without free capacity. Hard blockers (the buyer or
   * seller themselves, a suspended account, no printer at all) are never overridden.
   * The maker still has to accept. An `unmatched` order is reopened.
   */
  async offerTo(
    orderId: number,
    manufacturerProfileId: number,
    adminId: number,
    options: { allowOverride?: boolean } = {}
  ): Promise<MatchOffer> {
    const cfg = fabrmatchConfig.matching
    const offer = await db.transaction(async (trx) => {
      const order = await Order.query({ client: trx }).where('id', orderId).forUpdate().first()
      if (!order || !['matching', 'unmatched'].includes(order.status)) {
        throw new OfferError('This order is not waiting for a maker')
      }
      const pending = await MatchOffer.query({ client: trx })
        .where('orderId', orderId)
        .where('status', 'pending')
        .first()
      if (pending) throw new OfferError('An offer is already out for this order')

      const previous = await MatchOffer.query({ client: trx })
        .where('orderId', orderId)
        .select('manufacturerProfileId', 'status')
      const candidates = await this.eligibility.findCandidates(order, {
        excludeManufacturerIds: previous.map((o) => o.manufacturerProfileId),
        buyerCity: this.orders.decryptShippingAddress(order)?.city ?? null,
      })
      const { ranked } = rankCandidates(candidates, this.rng, cfg)
      const chosen = ranked.find((c) => c.manufacturerProfileId === manufacturerProfileId)

      let target: { printerId: number; slotDate: DateTime; score: number; unmet: string[] }
      if (chosen) {
        target = {
          printerId: chosen.printerId,
          slotDate: DateTime.fromISO(chosen.slotDate),
          score: chosen.score,
          unmet: [],
        }
      } else {
        if (!options.allowOverride) {
          throw new OfferError('This maker is no longer eligible for the order')
        }
        target = await this.overrideTarget(order, manufacturerProfileId, previous)
      }

      if (order.status === 'unmatched') {
        await this.sm.transition(orderId, 'matching', {
          trx,
          actorId: adminId,
          meta: { by: 'admin_match' },
        })
      }
      order.matchingRound += 1
      await order.useTransaction(trx).save()

      const created = await MatchOffer.create(
        {
          orderId: order.id,
          manufacturerProfileId,
          printerId: target.printerId,
          slotDate: target.slotDate,
          round: order.matchingRound,
          score: target.score,
          isExploration: false,
          adminOverride: !chosen,
          status: 'pending',
          expiresAt: DateTime.now().plus({ minutes: cfg.offerTtlMinutes }),
        },
        { client: trx }
      )
      await this.audit(
        trx,
        'match.offer_created',
        order.id,
        {
          offerId: created.id,
          round: created.round,
          score: created.score,
          rank: chosen ? ranked.indexOf(chosen) + 1 : null,
          candidateCount: ranked.length,
          by: 'admin',
          ...(chosen ? {} : { override: true, unmetRules: target.unmet }),
        },
        adminId
      )
      return created
    })
    await this.effects.offerCreated(offer)
    return offer
  }

  /** The printer an override offer goes to: the one missing the fewest rules, else any printer. */
  private async overrideTarget(
    order: Order,
    manufacturerProfileId: number,
    previous: MatchOffer[]
  ) {
    const verdicts = await new EligibilityExplainer().explain(order, {
      offeredStatuses: new Map(previous.map((o) => [o.manufacturerProfileId, o.status])),
    })
    const verdict = verdicts.find((v) => v.manufacturerProfileId === manufacturerProfileId)
    if (!verdict) throw new OfferError('Maker not found')
    const hard = verdict.reasons.filter(isHardBlocker)
    if (hard.length > 0) {
      throw new OfferError(
        `This maker cannot take the order (${hard.map((r) => r.code).join(', ')})`
      )
    }

    const best = [...verdict.printers].sort((a, b) => a.reasons.length - b.reasons.length)[0]
    const printer = best
      ? await Printer.findOrFail(best.printerId)
      : await Printer.query()
          .where('manufacturerProfileId', manufacturerProfileId)
          .orderBy('id', 'asc')
          .firstOrFail()
    const slot = await CapacitySlot.query()
      .where('printerId', printer.id)
      .where('date', '>=', DateTime.now().toISODate()!)
      .orderBy('date', 'asc')
      .first()
    return {
      printerId: printer.id,
      slotDate: !slot
        ? DateTime.now()
        : (slot.date as unknown) instanceof Date
          ? DateTime.fromJSDate(slot.date as unknown as Date)
          : DateTime.fromISO(String(slot.date).slice(0, 10)),
      score: 0,
      unmet: [...verdict.reasons.map((r) => r.code), ...(best?.reasons.map((r) => r.code) ?? [])],
    }
  }

  /**
   * Accept is serialized on the offer row lock: a second concurrent accept (or an expiry)
   * sees a non-pending status and fails. Capacity is reserved in the same transaction.
   */
  async acceptOffer(
    offerId: number,
    manufacturerProfileId: number,
    actorId: number | null = null
  ): Promise<ProductionJob> {
    const job = await db.transaction(async (trx) => {
      const offer = await this.lockOwnedOffer(offerId, manufacturerProfileId, trx)
      if (offer.expiresAt <= DateTime.now()) throw new OfferError('Offer has expired')

      const order = await Order.query({ client: trx })
        .where('id', offer.orderId)
        .forUpdate()
        .firstOrFail()
      if (order.status !== 'matching') throw new OfferError('Order is no longer open for matching')
      await order.load('items', (q) => q.preload('modelFile'))

      const minutes = order.items.reduce((sum, i) => sum + i.estPrintMinutes, 0)
      const now = DateTime.now()
      const dueAt = now.plus({ days: await productionDaysFor(order.items) })

      if (!offer.printerId) throw new OfferError('Offer has no printer assigned')
      const slot = await this.capacity.reserveInWindow(
        offer.printerId,
        now.toISODate()!,
        dueAt.toISODate()!,
        minutes,
        trx
      )
      // an admin override may knowingly go to a printer without free hours: accept anyway
      if (!slot && !offer.adminOverride) {
        throw new OfferError('Not enough free capacity on the matched printer')
      }

      const productionJob = await ProductionJob.create(
        {
          orderId: order.id,
          manufacturerProfileId,
          printerId: offer.printerId,
          status: 'accepted',
          acceptedAt: now,
          dueAt,
        },
        { client: trx }
      )

      offer.status = 'accepted'
      offer.respondedAt = now
      await offer.useTransaction(trx).save()

      await this.sm.transition(order.id, 'in_production', {
        trx,
        actorId,
        meta: { offerId: offer.id, productionJobId: productionJob.id, slotId: slot?.id ?? null },
      })

      const profile = await ManufacturerProfile.findOrFail(manufacturerProfileId, { client: trx })
      for (const item of order.items) {
        await this.fileAccess.createGrant(item.modelFile, profile, productionJob.id, trx)
      }

      return productionJob
    })

    await this.effects.offerAccepted(job)
    return job
  }

  async declineOffer(
    offerId: number,
    manufacturerProfileId: number,
    actorId: number | null = null
  ): Promise<MatchOffer | null> {
    const orderId = await db.transaction(async (trx) => {
      const offer = await this.lockOwnedOffer(offerId, manufacturerProfileId, trx)
      offer.status = 'declined'
      offer.respondedAt = DateTime.now()
      await offer.useTransaction(trx).save()
      await this.audit(trx, 'match.offer_declined', offer.orderId, { offerId }, actorId)
      return offer.orderId
    })
    return this.runRound(orderId)
  }

  /** Idempotent; safe to call early or twice. Returns the next offer if a new round started. */
  async expireOffer(offerId: number): Promise<MatchOffer | null> {
    const orderId = await db.transaction(async (trx) => {
      const offer = await MatchOffer.query({ client: trx }).where('id', offerId).forUpdate().first()
      if (!offer || offer.status !== 'pending' || offer.expiresAt > DateTime.now()) return null
      offer.status = 'expired'
      await offer.useTransaction(trx).save()
      await this.audit(trx, 'match.offer_expired', offer.orderId, { offerId })
      return offer.orderId
    })
    return orderId === null ? null : this.runRound(orderId)
  }

  /** Safety net in case a delayed ExpireOffer job was lost. */
  async expireStaleOffers(): Promise<number> {
    const stale = await MatchOffer.query()
      .where('status', 'pending')
      .where('expiresAt', '<=', DateTime.now().toSQL()!)
      .select('id')
    for (const offer of stale) await this.expireOffer(offer.id)
    return stale.length
  }

  private async lockOwnedOffer(
    offerId: number,
    manufacturerProfileId: number,
    trx: TransactionClientContract
  ): Promise<MatchOffer> {
    const offer = await MatchOffer.query({ client: trx }).where('id', offerId).forUpdate().first()
    if (!offer || offer.manufacturerProfileId !== manufacturerProfileId) {
      throw new OfferError('Offer not found')
    }
    if (offer.status !== 'pending') throw new OfferError('Offer is no longer pending')
    return offer
  }

  private async markUnmatched(
    orderId: number,
    reason: string,
    trx: TransactionClientContract
  ): Promise<RoundOutcome> {
    await this.sm.transition(orderId, 'unmatched', { trx, meta: { reason } })
    return { kind: 'unmatched', orderId, reason }
  }

  private async audit(
    trx: TransactionClientContract,
    action: string,
    orderId: number,
    meta: Record<string, unknown>,
    actorId: number | null = null
  ) {
    await AuditLog.create(
      { actorId, action, subjectType: 'order', subjectId: orderId, meta },
      { client: trx }
    )
  }
}
