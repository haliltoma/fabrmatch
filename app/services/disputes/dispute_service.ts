import DomainError from '#exceptions/domain_error'
import { cleanStoredPhoto } from '#services/files/photo_cleaner'
import CapacityService from '#services/manufacturing/capacity_service'
import db from '@adonisjs/lucid/services/db'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import drive from '@adonisjs/drive/services/main'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import fabrmatchConfig from '#config/fabrmatch'
import { pageMeta, pageParams } from '#services/pagination'
import Order from '#models/order'
import Dispute from '#models/dispute'
import type { DisputeResolution } from '#models/dispute'
import DisputeEvidence from '#models/dispute_evidence'
import ManufacturerProfile from '#models/manufacturer_profile'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import JobQcPhoto from '#models/job_qc_photo'
import ProductionJob from '#models/production_job'
import AuditLog from '#models/audit_log'
import OrderStateMachine from '#services/orders/order_state_machine'
import LedgerService from '#services/payments/ledger_service'
import OrderNotifier from '#services/notifications/order_notifier'
import PaymentService from '#services/payments/payment_service'
import PayoutService from '#services/payments/payout_service'

export class DisputeError extends DomainError {}

const EVIDENCE_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}
const EVIDENCE_MAX_BYTES = 10 * 1024 * 1024

/** Confirms the browser really uploaded a small image before we record it as evidence. */
async function verifyEvidenceObject(storageKey: string) {
  if (app.inTest) return
  const disk = drive.use('s3')
  if (!(await disk.exists(storageKey))) throw new DisputeError('The evidence file was not uploaded')
  const meta = await disk.getMetaData(storageKey)
  if (meta.contentLength > EVIDENCE_MAX_BYTES) {
    await disk.delete(storageKey)
    throw new DisputeError('Evidence photos must be 10 MB or smaller')
  }
  if (!meta.contentType || !(meta.contentType in EVIDENCE_TYPES)) {
    await disk.delete(storageKey)
    throw new DisputeError('Evidence must be a JPG, PNG or WebP image')
  }
}

export interface ResolveInput {
  resolution: DisputeResolution
  /** Required (and only used) for `partial_refund`. */
  refundMinor?: number
  note?: string
}

export default class DisputeService {
  private sm = new OrderStateMachine()
  private ledger = new LedgerService()
  private notifier = new OrderNotifier()

  private injectedPayments: PaymentService | null
  private injectedPayouts: PayoutService | null

  constructor(
    payments: PaymentService | null = null,
    payouts: PayoutService | null = null,
    private startRematch: (orderId: number) => Promise<unknown> = async (orderId) => {
      const { default: MatchingService } = await import('#services/matching/matching_service')
      return new MatchingService().runRound(orderId)
    }
  ) {
    this.injectedPayments = payments
    this.injectedPayouts = payouts
  }

  // Lazy: opening a dispute or attaching photos needs no payment provider.
  private get payments() {
    return (this.injectedPayments ??= new PaymentService())
  }

  private get payouts() {
    return (this.injectedPayouts ??= new PayoutService())
  }

  /** Buyer opens a dispute within the window after delivery; payout is blocked from then on. */
  async open(orderId: number, buyerId: number, reason: string): Promise<Dispute> {
    const text = reason.trim()
    if (text.length < 10)
      throw new DisputeError('Please describe the problem (at least 10 characters)')

    const opened = await db.transaction(async (trx) => {
      const order = await Order.query({ client: trx })
        .where('id', orderId)
        .where('buyerId', buyerId)
        .forUpdate()
        .first()
      if (!order) throw new DisputeError('Order not found')
      if (order.status !== 'delivered') {
        throw new DisputeError('A dispute can only be opened on a delivered order')
      }
      const windowEnd = order.deliveredAt?.plus({ days: fabrmatchConfig.orders.autoConfirmDays })
      if (!windowEnd || windowEnd < DateTime.now()) {
        throw new DisputeError('The dispute window for this order has closed')
      }

      await this.sm.transition(orderId, 'disputed', { trx, actorId: buyerId })
      const dispute = await Dispute.create(
        { orderId, openedBy: buyerId, reason: text, status: 'open', refundMinor: 0 },
        { client: trx }
      )
      await AuditLog.create(
        {
          actorId: buyerId,
          action: 'dispute.opened',
          subjectType: 'order',
          subjectId: orderId,
          meta: { disputeId: dispute.id },
        },
        { client: trx }
      )
      await this.attachQcPhotos(dispute.id, orderId, trx)
      return dispute
    })
    await this.notifier.disputeOpened(opened.id)
    return opened
  }

  /** The maker's pre-shipping photos become the first evidence, so both sides see the same record. */
  private async attachQcPhotos(disputeId: number, orderId: number, trx: TransactionClientContract) {
    const job = await ProductionJob.query({ client: trx })
      .where('orderId', orderId)
      .whereNot('status', 'cancelled')
      .preload('manufacturerProfile')
      .first()
    if (!job) return
    const photos = await JobQcPhoto.query({ client: trx }).where('productionJobId', job.id)
    for (const photo of photos) {
      await DisputeEvidence.create(
        {
          disputeId,
          uploaderId: job.manufacturerProfile.userId,
          storageKey: photo.storageKey,
          note: 'Quality-check photo taken before shipping',
        },
        { client: trx }
      )
    }
  }

  /** Short-lived signed PUT URL for one evidence photo; participants only. */
  async presignEvidenceUpload(disputeId: number, userId: number, contentType: string) {
    const ext = EVIDENCE_TYPES[contentType]
    if (!ext) throw new DisputeError('Evidence must be a JPG, PNG or WebP image')
    const dispute = await Dispute.findOrFail(disputeId)
    await this.assertParticipant(dispute, userId)
    if (dispute.status === 'resolved') throw new DisputeError('This dispute is already resolved')

    const storageKey = `disputes/${disputeId}/${randomUUID()}${ext}`
    const signedUrl = await drive
      .use('s3')
      .getSignedUploadUrl(storageKey, { expiresIn: '10m', contentType })
    return { storageKey, signedUrl }
  }

  /** Dispute for an order, visible to its buyer (or admin when `buyerId` is null). */
  async findForOrder(orderId: number): Promise<Dispute | null> {
    return Dispute.query()
      .where('orderId', orderId)
      .orderBy('id', 'desc')
      .preload('evidence')
      .first()
  }

  async listForAdmin(params: { page?: number; perPage?: number } = {}) {
    const { page, perPage } = pageParams(params)
    const paginator = await Dispute.query()
      .preload('order')
      .orderByRaw(`case status when 'open' then 0 when 'responded' then 1 else 2 end`)
      .orderBy('id', 'desc')
      .paginate(page, perPage)
    return { rows: paginator.all(), meta: pageMeta(paginator.total, page, perPage) }
  }

  async findForAdmin(disputeId: number): Promise<Dispute> {
    return Dispute.query()
      .where('id', disputeId)
      .preload('evidence')
      .preload('order', (q) =>
        q
          .preload('items', (i) => i.preload('modelFile'))
          .preload('productionJobs', (j) => j.preload('manufacturerProfile'))
      )
      .firstOrFail()
  }

  /** Signed, short-lived view URLs for a dispute's photos. */
  async evidenceUrls(evidence: DisputeEvidence[]): Promise<Record<number, string>> {
    const disk = drive.use('s3')
    const entries = await Promise.all(
      evidence.map(
        async (e) => [e.id, await disk.getSignedUrl(e.storageKey, { expiresIn: '15m' })] as const
      )
    )
    return Object.fromEntries(entries)
  }

  /** Buyer or the producing manufacturer attaches a photo (already uploaded to Drive). */
  async addEvidence(
    disputeId: number,
    uploaderId: number,
    input: { storageKey: string; note?: string }
  ): Promise<DisputeEvidence> {
    const dispute = await Dispute.findOrFail(disputeId)
    await this.assertParticipant(dispute, uploaderId)
    if (dispute.status === 'resolved') throw new DisputeError('This dispute is already resolved')

    const keyPattern = new RegExp(`^disputes/${disputeId}/[0-9a-f-]{36}\\.(jpg|png|webp)$`)
    // tests use readable names; real keys always come from presignEvidenceUpload (uuid)
    if (
      !(app.inTest
        ? input.storageKey.startsWith(`disputes/${disputeId}/`)
        : keyPattern.test(input.storageKey))
    ) {
      throw new DisputeError('Invalid evidence file location')
    }
    const existing = await DisputeEvidence.query()
      .where('disputeId', disputeId)
      .where('uploaderId', uploaderId)
      .count('* as total')
      .first()
    if (Number(existing?.$extras.total ?? 0) >= 10) {
      throw new DisputeError('Photo limit reached for this dispute')
    }
    await verifyEvidenceObject(input.storageKey)
    // the other side sees evidence photos: no GPS or device data
    await cleanStoredPhoto(input.storageKey)
    return DisputeEvidence.create({
      disputeId,
      uploaderId,
      storageKey: input.storageKey,
      note: input.note?.trim() || null,
    })
  }

  async respond(disputeId: number, manufacturerProfileId: number, text: string): Promise<Dispute> {
    const response = text.trim()
    if (response.length < 5) throw new DisputeError('Please write a response')

    const responded = await db.transaction(async (trx) => {
      const dispute = await Dispute.query({ client: trx })
        .where('id', disputeId)
        .forUpdate()
        .firstOrFail()
      if (dispute.status === 'resolved') throw new DisputeError('This dispute is already resolved')

      const job = await ProductionJob.query({ client: trx })
        .where('orderId', dispute.orderId)
        .whereNot('status', 'cancelled')
        .first()
      if (!job || job.manufacturerProfileId !== manufacturerProfileId) {
        throw new DisputeError('Dispute not found')
      }

      dispute.manufacturerResponse = response
      dispute.status = 'responded'
      await dispute.useTransaction(trx).save()
      return dispute
    })
    await this.notifier.disputeResponded(responded.id)
    return responded
  }

  /**
   * Admin decision. The refund is recorded in the ledger inside the same transaction as the
   * state change; the provider call and the payout run after commit (both idempotent, with
   * sweeps as safety net). A partial refund is taken from the manufacturer's share only.
   */
  async resolve(disputeId: number, adminId: number, input: ResolveInput): Promise<Dispute> {
    const { resolved, orderId, refunded, reprint } = await db.transaction(async (trx) => {
      const dispute = await Dispute.query({ client: trx })
        .where('id', disputeId)
        .forUpdate()
        .firstOrFail()
      if (dispute.status === 'resolved') throw new DisputeError('This dispute is already resolved')

      const order = await Order.query({ client: trx })
        .where('id', dispute.orderId)
        .forUpdate()
        .firstOrFail()
      if (order.status !== 'disputed') throw new DisputeError('The order is not in dispute')

      const escrow = await this.ledger.balance('buyer_escrow', {
        orderId: order.id,
        currency: order.currency,
        trx,
      })
      const manufacturerShare =
        escrow - order.platformFeeMinor - (order.sellerId ? order.sellerShareMinor : 0)

      let refundMinor = 0
      if (input.resolution === 'full_refund') {
        refundMinor = escrow
      } else if (input.resolution === 'partial_refund') {
        refundMinor = input.refundMinor ?? 0
        if (!Number.isSafeInteger(refundMinor) || refundMinor <= 0) {
          throw new DisputeError('A partial refund needs a positive amount')
        }
        if (refundMinor > manufacturerShare) {
          throw new DisputeError(
            `A partial refund cannot exceed the manufacturer share (${manufacturerShare})`
          )
        }
      }

      if (refundMinor > 0) {
        await this.payments.recordRefundObligation(order.id, refundMinor, order.currency, trx)
      }

      const isReprint = input.resolution === 'reproduce'
      if (isReprint) await this.startReprint(order.id, disputeId, trx)

      dispute.status = 'resolved'
      dispute.resolution = input.resolution
      dispute.refundMinor = refundMinor
      dispute.adminNote = input.note?.trim() || null
      dispute.resolvedBy = adminId
      dispute.resolvedAt = DateTime.now()
      await dispute.useTransaction(trx).save()

      // a reprint sends the order back to matching; every other decision closes it
      await this.sm.transition(order.id, isReprint ? 'matching' : 'resolved', {
        trx,
        actorId: adminId,
        meta: { disputeId, resolution: input.resolution, refundMinor },
      })
      return { resolved: dispute, orderId: order.id, refunded: refundMinor > 0, reprint: isReprint }
    })

    if (refunded) await this.safely('refund', orderId, () => this.payments.settleRefunds(orderId))
    if (reprint) {
      await this.safely('reprint matching', orderId, () => this.startRematch(orderId))
    } else if (input.resolution !== 'full_refund') {
      await this.safely('payout', orderId, () => this.payouts.release(orderId))
    }
    await this.notifier.disputeResolved(resolved.id)
    return resolved
  }

  /**
   * Reprint: the faulty job is cancelled (the maker is not paid and the dispute stays on their
   * record), their file access ends, and the order re-enters matching with escrow untouched.
   * The maker who already failed is excluded automatically — they hold an earlier offer.
   * Allowed once per order so a bad order cannot loop forever.
   */
  private async startReprint(orderId: number, disputeId: number, trx: TransactionClientContract) {
    const earlier = await Dispute.query({ client: trx })
      .where('orderId', orderId)
      .whereNot('id', disputeId)
      .where('resolution', 'reproduce')
      .first()
    if (earlier) {
      throw new DisputeError('This order was already reprinted once; refund or release instead')
    }
    const job = await ProductionJob.query({ client: trx })
      .where('orderId', orderId)
      .whereNot('status', 'cancelled')
      .forUpdate()
      .first()
    if (!job) throw new DisputeError('There is no production job to reprint')

    job.status = 'cancelled'
    job.cancelReason = 'dispute_reprint'
    await job.useTransaction(trx).save()
    await new CapacityService().releaseForJob(job, trx)
    await trx
      .from('file_access_grants')
      .where('production_job_id', job.id)
      .update({ expires_at: DateTime.now().toSQL() })
    await trx
      .from('orders')
      .where('id', orderId)
      .update({ matching_round: 0, delivered_at: null, updated_at: DateTime.now().toSQL() })
  }

  private async assertParticipant(dispute: Dispute, userId: number) {
    const order = await Order.findOrFail(dispute.orderId)
    if (order.buyerId === userId) return

    const profile = await ManufacturerProfile.query().where('userId', userId).first()
    const job = profile
      ? await ProductionJob.query()
          .where('orderId', order.id)
          .where('manufacturerProfileId', profile.id)
          .whereNot('status', 'cancelled')
          .first()
      : null
    if (!job) throw new DisputeError('Dispute not found')
  }

  private async safely(label: string, orderId: number, fn: () => Promise<unknown>) {
    try {
      await fn()
    } catch (error) {
      logger.error({
        msg: `dispute ${label} failed after resolution`,
        orderId,
        error: (error as Error).message,
      })
    }
  }
}
