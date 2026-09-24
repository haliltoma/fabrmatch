import DomainError from '#exceptions/domain_error'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import AuditLog from '#models/audit_log'
import ManufacturerProfile from '#models/manufacturer_profile'
import Order from '#models/order'
import SupportService from '#services/support/support_service'
import ChargebackService from '#services/payments/chargeback_service'
import ContentReportService from '#services/admin/content_report_service'
import FraudService from '#services/admin/fraud_service'
import FulfillmentService from '#services/orders/fulfillment_service'

export class QueueError extends DomainError {}

export type AckQueue = 'payment_review' | 'reconcile'

const RECONCILE_LOOKBACK_DAYS = 3

/**
 * Everything that needs a human, in one place (R3-T1). Items are derived from real state or the
 * audit log; nothing here keeps a second copy that could drift.
 */
export default class AdminQueueService {
  async unmatchedOrders() {
    const orders = await Order.query().where('status', 'unmatched').orderBy('updatedAt', 'asc')
    return orders.map((o) => ({
      id: o.id,
      code: o.code,
      matchingRound: o.matchingRound,
      totalMinor: o.totalMinor,
      currency: o.currency,
      since: o.updatedAt.toISO(),
    }))
  }

  async overdueJobs(now: DateTime = DateTime.now()) {
    const { overdue, critical } = await new FulfillmentService().slaReport(now)
    if (overdue.length === 0) return []
    const criticalIds = new Set(critical.map((j) => j.id))
    await Promise.all(
      overdue.map(async (job) => {
        await job.load('order')
        await job.load('manufacturerProfile')
      })
    )
    return overdue.map((job) => ({
      jobId: job.id,
      orderId: job.orderId,
      orderCode: job.order.code,
      status: job.status,
      manufacturerAlias: job.manufacturerProfile.publicAlias,
      dueAt: job.dueAt.toISO(),
      critical: criticalIds.has(job.id),
    }))
  }

  async paymentReviews() {
    const rows = await db.rawQuery(
      `select a.id, a.meta, a.created_at
         from audit_logs a
        where a.action = 'payment.needs_review'
          and not exists (
            select 1 from audit_logs r
             where r.action = 'queue.acknowledged'
               and r.meta->>'queue' = 'payment_review'
               and r.meta->>'ref' = a.meta->>'eventId')
        order by a.id desc
        limit 100`
    )
    return (rows.rows as Array<{ id: number; meta: Record<string, string>; created_at: Date }>).map(
      (r) => ({
        ref: String(r.meta.eventId),
        providerRef: r.meta.providerRef ?? null,
        reason: r.meta.reason ?? null,
        at: DateTime.fromJSDate(r.created_at).toISO(),
      })
    )
  }

  async reconcileFindings(now: DateTime = DateTime.now()) {
    const since = now.minus({ days: RECONCILE_LOOKBACK_DAYS }).toSQL()!
    const rows = await db.rawQuery(
      `select distinct on (a.subject_type, a.subject_id, a.meta->>'kind')
              a.subject_type, a.subject_id, a.meta, a.created_at
         from audit_logs a
        where a.action = 'reconcile.discrepancy'
          and a.created_at >= ?
          and not exists (
            select 1 from audit_logs r
             where r.action = 'queue.acknowledged'
               and r.meta->>'queue' = 'reconcile'
               and r.meta->>'ref' = a.subject_type || ':' || a.subject_id || ':' || (a.meta->>'kind')
               and r.created_at >= a.created_at)
        order by a.subject_type, a.subject_id, a.meta->>'kind', a.created_at desc`,
      [since]
    )
    return (
      rows.rows as Array<{
        subject_type: string
        subject_id: number
        meta: { kind: string; detail: string }
        created_at: Date
      }>
    ).map((r) => ({
      ref: `${r.subject_type}:${r.subject_id}:${r.meta.kind}`,
      kind: r.meta.kind,
      orderId: r.subject_type === 'order' ? r.subject_id : null,
      detail: r.meta.detail,
      at: DateTime.fromJSDate(r.created_at).toISO(),
    }))
  }

  async pendingMakers() {
    const profiles = await ManufacturerProfile.query()
      .where('status', 'pending')
      .preload('user')
      .orderBy('createdAt', 'asc')
    return profiles.map((p) => ({
      id: p.id,
      alias: p.publicAlias,
      email: p.user.email,
      city: p.city,
      country: p.country,
      isCorporate: p.isCorporate,
      createdAt: p.createdAt.toISO(),
    }))
  }

  async counts() {
    const [unmatched, overdue, reviews, findings, makers, fraud, reports, chargebacks, support] =
      await Promise.all([
        this.unmatchedOrders(),
        this.overdueJobs(),
        this.paymentReviews(),
        this.reconcileFindings(),
        this.pendingMakers(),
        new FraudService().listOpen(),
        new ContentReportService().listOpen(),
        new ChargebackService().listOpen(),
        new SupportService().listOpen(),
      ])
    return {
      support: support.length,
      chargebacks: chargebacks.length,
      fraud: fraud.length,
      reports: reports.length,
      unmatched: unmatched.length,
      overdue: overdue.length,
      paymentReviews: reviews.length,
      reconcile: findings.length,
      pendingMakers: makers.length,
    }
  }

  async acknowledge(queue: AckQueue, ref: string, adminId: number) {
    if (!ref.trim()) throw new QueueError('Missing item reference')
    await AuditLog.create({
      actorId: adminId,
      action: 'queue.acknowledged',
      subjectType: 'queue',
      subjectId: 0,
      meta: { queue, ref },
    })
  }

  /** Approving is what lets a maker receive offers (eligibility requires `active`). */
  async decideMaker(profileId: number, decision: 'approve' | 'reject', adminId: number) {
    await db.transaction(async (trx) => {
      const profile = await ManufacturerProfile.query({ client: trx })
        .where('id', profileId)
        .forUpdate()
        .first()
      if (!profile || profile.status !== 'pending') {
        throw new QueueError('This maker is not waiting for approval')
      }
      profile.status = decision === 'approve' ? 'active' : 'suspended'
      await profile.useTransaction(trx).save()
      await AuditLog.create(
        {
          actorId: adminId,
          action: decision === 'approve' ? 'maker.approved' : 'maker.rejected',
          subjectType: 'manufacturer_profile',
          subjectId: profile.id,
          meta: {},
        },
        { client: trx }
      )
    })
  }
}
