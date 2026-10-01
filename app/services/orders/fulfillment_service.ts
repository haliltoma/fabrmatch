import DomainError from '#exceptions/domain_error'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import fabrmatchConfig from '#config/fabrmatch'
import Order from '#models/order'
import JobQcPhoto from '#models/job_qc_photo'
import ProductionJob from '#models/production_job'
import type { ProductionJobStatus } from '#models/production_job'
import AuditLog from '#models/audit_log'
import OrderNotifier from '#services/notifications/order_notifier'
import OrderStateMachine, {
  InvalidOrderTransitionError,
} from '#services/orders/order_state_machine'

export class FulfillmentError extends DomainError {}

const ACTIVE_JOB_STATUSES: ProductionJobStatus[] = ['accepted', 'printing', 'produced']

const JOB_FLOW: Record<ProductionJobStatus, readonly ProductionJobStatus[]> = {
  accepted: ['printing', 'produced', 'cancelled'],
  printing: ['produced', 'cancelled'],
  produced: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
}

export interface SlaReport {
  overdue: ProductionJob[]
  critical: ProductionJob[]
}

/** Best-effort, after commit: the `ReleasePayouts` sweep is the safety net if this is lost. */
async function dispatchPayoutRelease(orderId: string) {
  if (app.inTest) return
  try {
    const { default: ReleasePayouts } = await import('#jobs/release_payouts')
    await ReleasePayouts.dispatch({ orderId })
  } catch (error) {
    logger.error({
      msg: 'could not queue payout release',
      orderId,
      error: (error as Error).message,
    })
  }
}

export default class FulfillmentService {
  private sm = new OrderStateMachine()
  private notifier = new OrderNotifier()

  async markPrinting(jobId: string, manufacturerProfileId: string, actorId: string | null = null) {
    return db.transaction(async (trx) => {
      const job = await this.lockMakerJob(jobId, manufacturerProfileId, trx)
      this.assertJobStep(job, 'printing')
      job.status = 'printing'
      await job.useTransaction(trx).save()
      await this.audit(trx, 'job.printing', job.orderId, { jobId }, actorId)
      return job
    })
  }

  async markProduced(jobId: string, manufacturerProfileId: string, actorId: string | null = null) {
    return db.transaction(async (trx) => {
      const job = await this.lockMakerJob(jobId, manufacturerProfileId, trx)
      this.assertJobStep(job, 'produced')
      job.status = 'produced'
      job.producedAt = DateTime.now()
      await job.useTransaction(trx).save()
      await this.audit(trx, 'job.produced', job.orderId, { jobId }, actorId)
      return job
    })
  }

  async markShipped(
    jobId: string,
    manufacturerProfileId: string,
    shipment: { carrier: string; trackingNumber: string },
    actorId: string | null = null
  ) {
    const shipped = await db.transaction(async (trx) => {
      const job = await this.lockMakerJob(jobId, manufacturerProfileId, trx)
      this.assertJobStep(job, 'shipped')
      const photos = await JobQcPhoto.query({ client: trx })
        .where('productionJobId', jobId)
        .count('* as n')
        .first()
      if (Number(photos?.$extras.n ?? 0) < 1) {
        throw new FulfillmentError('Add at least one photo of the finished part before shipping')
      }
      job.status = 'shipped'
      job.shippedAt = DateTime.now()
      job.carrier = shipment.carrier.trim()
      job.trackingNumber = shipment.trackingNumber.trim()
      await job.useTransaction(trx).save()
      await this.sm.transition(job.orderId, 'shipped', {
        trx,
        actorId,
        meta: { jobId, carrier: job.carrier },
      })
      return job
    })
    await this.notifier.shipped(shipped.orderId)
    // an order from the seller's own shop gets its tracking written back there (R4-T4)
    const { default: StoreService } = await import('#services/integrations/stores/store_service')
    await new StoreService().orderShipped(shipped.orderId)
    return shipped
  }

  /** Buyer (or admin) confirms the parcel arrived; starts the dispute window. */
  async markDelivered(orderId: string, actorId: string | null, meta: Record<string, unknown> = {}) {
    const delivered = await db.transaction(async (trx) => {
      const order = await this.sm.transition(orderId, 'delivered', { trx, actorId, meta })
      await ProductionJob.query({ client: trx })
        .where('orderId', orderId)
        .where('status', 'shipped')
        .update({ status: 'delivered', updatedAt: DateTime.now().toSQL() })
      return order
    })
    await this.notifier.delivered(orderId)
    return delivered
  }

  async markDeliveredByBuyer(orderId: string, buyerId: string) {
    await this.assertBuyer(orderId, buyerId)
    return this.markDelivered(orderId, buyerId, { by: 'buyer' })
  }

  /** Buyer waives the rest of the dispute window. */
  async completeByBuyer(orderId: string, buyerId: string) {
    await this.assertBuyer(orderId, buyerId)
    const order = await this.sm.transition(orderId, 'completed', {
      actorId: buyerId,
      meta: { by: 'buyer' },
    })
    await this.notifier.completed(orderId)
    await dispatchPayoutRelease(orderId)
    return order
  }

  /**
   * Periodic sweep (idempotent): shipped → delivered after `autoDeliverDaysAfterShip`,
   * delivered → completed after `autoConfirmDays`. Disputed orders are never touched
   * because the state machine re-checks the status under a row lock.
   */
  async runAutoTransitions(now: DateTime = DateTime.now()) {
    const cfg = fabrmatchConfig.orders

    // Complete first so an order auto-delivered in this sweep still gets its full dispute window.
    const toComplete = await Order.query()
      .where('status', 'delivered')
      .where('deliveredAt', '<=', now.minus({ days: cfg.autoConfirmDays }).toSQL()!)
      .select('id')

    let completed = 0
    for (const { id } of toComplete) {
      const ok = await this.tryTransition(() =>
        this.sm.transition(id, 'completed', { meta: { by: 'auto' } })
      )
      if (ok) {
        completed++
        await this.notifier.completed(id)
        await dispatchPayoutRelease(id)
      }
    }

    const toDeliver = await Order.query()
      .where('status', 'shipped')
      .whereHas('productionJobs', (q) => {
        q.where('status', 'shipped').where(
          'shippedAt',
          '<=',
          now.minus({ days: cfg.autoDeliverDaysAfterShip }).toSQL()!
        )
      })
      .select('id')

    let delivered = 0
    for (const { id } of toDeliver) {
      if (await this.tryTransition(() => this.markDelivered(id, null, { by: 'auto' }))) delivered++
    }

    return { delivered, completed }
  }

  async review(orderId: string, buyerId: string, rating: number, comment: string | null) {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new FulfillmentError('Rating must be an integer between 1 and 5')
    }
    return db.transaction(async (trx) => {
      const order = await Order.query({ client: trx }).where('id', orderId).forUpdate().first()
      if (!order || order.buyerId !== buyerId) throw new FulfillmentError('Order not found')
      if (!['delivered', 'completed'].includes(order.status)) {
        throw new FulfillmentError('Only delivered orders can be reviewed')
      }
      const job = await ProductionJob.query({ client: trx })
        .where('orderId', orderId)
        .whereNot('status', 'cancelled')
        .forUpdate()
        .firstOrFail()
      if (job.rating !== null) throw new FulfillmentError('Order already reviewed')

      job.rating = rating
      job.reviewComment = comment?.trim() || null
      await job.useTransaction(trx).save()
      await this.audit(trx, 'job.reviewed', orderId, { jobId: job.id, rating }, buyerId)
      return job
    })
  }

  /** overdue: past due_at. critical: past 2× SLA → admin may re-match. */
  async slaReport(now: DateTime = DateTime.now()): Promise<SlaReport> {
    const late = await ProductionJob.query()
      .whereIn('status', ACTIVE_JOB_STATUSES)
      .where('dueAt', '<', now.toSQL()!)
      .orderBy('dueAt', 'asc')

    const critical = late.filter((job) => {
      const sla = job.dueAt.diff(job.acceptedAt)
      return now >= job.acceptedAt.plus(sla).plus(sla)
    })
    return { overdue: late, critical }
  }

  private async tryTransition(fn: () => Promise<unknown>): Promise<boolean> {
    try {
      await fn()
      return true
    } catch (error) {
      // Status changed between selection and lock (e.g. dispute opened) — skip.
      if (error instanceof InvalidOrderTransitionError) return false
      throw error
    }
  }

  private async assertBuyer(orderId: string, buyerId: string) {
    const order = await Order.find(orderId)
    if (!order || order.buyerId !== buyerId) throw new FulfillmentError('Order not found')
  }

  private async lockMakerJob(
    jobId: string,
    manufacturerProfileId: string,
    trx: TransactionClientContract
  ) {
    const job = await ProductionJob.query({ client: trx }).where('id', jobId).forUpdate().first()
    if (!job || job.manufacturerProfileId !== manufacturerProfileId) {
      throw new FulfillmentError('Production job not found')
    }
    return job
  }

  private assertJobStep(job: ProductionJob, to: ProductionJobStatus) {
    if (!JOB_FLOW[job.status].includes(to)) {
      throw new FulfillmentError(`Cannot move job from ${job.status} to ${to}`)
    }
  }

  private async audit(
    trx: TransactionClientContract,
    action: string,
    orderId: string,
    meta: Record<string, unknown>,
    actorId: string | null
  ) {
    await AuditLog.create(
      { actorId, action, subjectType: 'order', subjectId: orderId, meta },
      { client: trx }
    )
  }
}
