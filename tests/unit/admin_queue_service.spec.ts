import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import AuditLog from '#models/audit_log'
import ManufacturerProfile from '#models/manufacturer_profile'
import ProductionJob from '#models/production_job'
import AdminQueueService, { QueueError } from '#services/admin/queue_service'
import FakePaymentProvider from '#services/payments/fake_provider'
import MatchingService, { OfferError } from '#services/matching/matching_service'
import type { MatchingEffects } from '#services/matching/matching_effects'
import OrderStateMachine from '#services/orders/order_state_machine'
import ReconciliationService from '#services/payments/reconciliation_service'
import LedgerService from '#services/payments/ledger_service'
import SupportService from '#services/support/support_service'
import {
  createDraftOrder,
  createFundedOrder,
  createManufacturer,
  createPrinter,
  createUser,
  orderStatus,
} from '#tests/helpers/order_fixtures'

const silentEffects: MatchingEffects = {
  async offerCreated() {},
  async offerAccepted() {},
  async orderUnmatched() {},
}

const queues = new AdminQueueService()

test.group('AdminQueueService', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('an unmatched order is listed and an admin re-match finds a newly approved maker', async ({
    assert,
  }) => {
    const admin = await createUser('admin')
    const { order } = await createDraftOrder()
    const sm = new OrderStateMachine()
    await sm.transition(order.id, 'awaiting_payment')
    await sm.transition(order.id, 'paid')
    const matching = new MatchingService(silentEffects, () => 0.99)

    assert.isNull(await matching.start(order.id))
    assert.equal(await orderStatus(order.id), 'unmatched')
    const listed = await queues.unmatchedOrders()
    assert.deepEqual(
      listed.map((o) => o.id),
      [order.id]
    )

    const applicant = await createManufacturer({ status: undefined })
    await createPrinter(applicant.profile)
    await ManufacturerProfile.query()
      .where('id', applicant.profile.id)
      .update({ status: 'pending' })
    assert.isNull(await matching.restart(order.id, admin.id), 'pending makers get no offers')
    assert.equal(await orderStatus(order.id), 'unmatched')

    await queues.decideMaker(applicant.profile.id, 'approve', admin.id)
    const offer = await matching.restart(order.id, admin.id)
    assert.exists(offer)
    assert.equal(offer!.manufacturerProfileId, applicant.profile.id)
    assert.equal(offer!.round, 1)
    assert.equal(await orderStatus(order.id), 'matching')
    assert.lengthOf(await queues.unmatchedOrders(), 0)
  })

  test('only an unmatched order can be re-matched', async ({ assert }) => {
    const admin = await createUser('admin')
    const { order } = await createFundedOrder(new FakePaymentProvider(), { upTo: 'in_production' })
    const matching = new MatchingService(silentEffects, () => 0.99)
    await assert.rejects(() => matching.restart(order.id, admin.id), /Only an unmatched/)
    assert.instanceOf(await matching.restart(order.id, admin.id).catch((e) => e), OfferError)
  })

  test('maker approval activates, rejection suspends, both are audited and single-shot', async ({
    assert,
  }) => {
    const admin = await createUser('admin')
    const a = await createManufacturer()
    const b = await createManufacturer()
    await ManufacturerProfile.query()
      .whereIn('id', [a.profile.id, b.profile.id])
      .update({ status: 'pending' })
    assert.lengthOf(await queues.pendingMakers(), 2)

    await queues.decideMaker(a.profile.id, 'approve', admin.id)
    await queues.decideMaker(b.profile.id, 'reject', admin.id)
    const approved = await ManufacturerProfile.findOrFail(a.profile.id)
    const rejected = await ManufacturerProfile.findOrFail(b.profile.id)
    assert.equal(approved.status, 'active')
    assert.equal(rejected.status, 'suspended')
    assert.lengthOf(await queues.pendingMakers(), 0)
    await assert.rejects(() => queues.decideMaker(a.profile.id, 'reject', admin.id), /not waiting/)
    assert.equal(
      await AuditLog.query()
        .where('action', 'maker.approved')
        .count('* as n')
        .then((r) => Number(r[0].$extras.n)),
      1
    )
  })

  test('late jobs are listed with a critical flag past 2x the deadline', async ({ assert }) => {
    const { order, profile } = await createFundedOrder(new FakePaymentProvider(), {
      upTo: 'in_production',
    })
    const job = await ProductionJob.query().where('orderId', order.id).firstOrFail()
    assert.lengthOf(await queues.overdueJobs(), 0)

    job.acceptedAt = DateTime.now().minus({ days: 12 })
    job.dueAt = DateTime.now().minus({ days: 7 })
    await job.save()
    const [late] = await queues.overdueJobs()
    assert.equal(late.orderId, order.id)
    assert.equal(late.manufacturerAlias, profile.publicAlias)
    assert.isTrue(late.critical)
  })

  test('payment reviews and reconcile findings disappear once acknowledged', async ({ assert }) => {
    const admin = await createUser('admin')
    await AuditLog.create({
      action: 'payment.needs_review',
      subjectType: 'payment',
      subjectId: 0,
      meta: { eventId: 'evt_1', providerRef: 'ref_1', reason: 'amount mismatch' },
    })
    const [review] = await queues.paymentReviews()
    assert.equal(review.ref, 'evt_1')
    await queues.acknowledge('payment_review', review.ref, admin.id)
    assert.lengthOf(await queues.paymentReviews(), 0)

    const { order } = await createFundedOrder(new FakePaymentProvider(), { upTo: 'in_production' })
    await new LedgerService().post(
      [
        { account: 'provider_cash', direction: 'debit', amountMinor: 321 },
        { account: 'platform_fee', direction: 'credit', amountMinor: 321 },
      ],
      { orderId: order.id }
    )
    await new ReconciliationService().run()
    const [finding] = await queues.reconcileFindings()
    assert.equal(finding.kind, 'cash_mismatch')
    assert.equal(finding.orderId, order.id)
    const counts = await queues.counts()
    assert.equal(counts.reconcile, 1)

    await queues.acknowledge('reconcile', finding.ref, admin.id)
    assert.lengthOf(await queues.reconcileFindings(), 0)
    await new ReconciliationService().run()
    assert.lengthOf(await queues.reconcileFindings(), 1, 'a fresh detection re-opens it')
  })

  test('acknowledging needs a reference', async ({ assert }) => {
    const admin = await createUser('admin')
    await assert.rejects(() => queues.acknowledge('reconcile', '  ', admin.id))
    assert.instanceOf(
      await queues.acknowledge('reconcile', ' ', admin.id).catch((e) => e),
      QueueError
    )
  })

  test('bulk: routine items are handled together, one bad item does not stop the rest', async ({
    assert,
  }) => {
    const admin = await createUser('admin')
    const support = new SupportService()
    for (const message of ['Where is my parcel?', 'Can I change the colour?']) {
      await support.submit({ userId: null, email: 'a@example.com', topic: 'order', message })
    }
    const open = await support.listOpen()
    assert.lengthOf(open, 2)

    const result = await queues.bulk(
      'support.answered',
      [...open.map((r) => String(r.id)), '999999'],
      admin.id
    )
    assert.deepEqual(result, { done: 2, failed: 1 })
    assert.lengthOf(await support.listOpen(), 0)

    for (const id of ['evt_a', 'evt_b']) {
      await AuditLog.create({
        action: 'payment.needs_review',
        subjectType: 'payment',
        subjectId: 0,
        meta: { eventId: id, providerRef: id, reason: 'amount mismatch' },
      })
    }
    const reviews = await queues.paymentReviews()
    await queues.bulk(
      'ack.payment_review',
      reviews.map((r) => r.ref),
      admin.id
    )
    assert.lengthOf(await queues.paymentReviews(), 0)
  })
})
