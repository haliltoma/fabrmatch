import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import FulfillmentService, { FulfillmentError } from '#services/orders/fulfillment_service'
import MatchingService from '#services/matching/matching_service'
import type { MatchingEffects } from '#services/matching/matching_effects'
import OrderStateMachine, {
  InvalidOrderTransitionError,
} from '#services/orders/order_state_machine'
import Order from '#models/order'
import ProductionJob from '#models/production_job'
import {
  addQcPhoto,
  createDraftOrder,
  createManufacturer,
  createPrinter,
  orderStatus,
} from '#tests/helpers/order_fixtures'

const noEffects: MatchingEffects = {
  offerCreated: async () => {},
  offerAccepted: async () => {},
  orderUnmatched: async () => {},
}

async function inProduction() {
  const maker = await createManufacturer()
  await createPrinter(maker.profile)
  const { order, buyer } = await createDraftOrder()
  const sm = new OrderStateMachine()
  await sm.transition(order.id, 'awaiting_payment')
  await sm.transition(order.id, 'paid')
  const matching = new MatchingService(noEffects, () => 0.99)
  const offer = await matching.start(order.id)
  const job = await matching.acceptOffer(offer!.id, maker.profile.id)
  return { order, buyer, maker, job }
}

async function shipped() {
  const ctx = await inProduction()
  const svc = new FulfillmentService()
  await svc.markProduced(ctx.job.id, ctx.maker.profile.id)
  await addQcPhoto(ctx.job.id)
  await svc.markShipped(ctx.job.id, ctx.maker.profile.id, {
    carrier: 'Yurtici',
    trackingNumber: ' YK-001 ',
  })
  return ctx
}

test.group('FulfillmentService', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  const svc = new FulfillmentService()

  test('maker flow: printing → produced → shipped moves the order to shipped', async ({
    assert,
  }) => {
    const { job, maker, order } = await inProduction()

    await svc.markPrinting(job.id, maker.profile.id)
    await svc.markProduced(job.id, maker.profile.id)
    await addQcPhoto(job.id)
    const shippedJob = await svc.markShipped(job.id, maker.profile.id, {
      carrier: 'Aras',
      trackingNumber: ' AR-9 ',
    })

    assert.equal(shippedJob.status, 'shipped')
    assert.equal(shippedJob.trackingNumber, 'AR-9')
    assert.isNotNull(shippedJob.producedAt)
    assert.equal(await orderStatus(order.id), 'shipped')
  })

  test('cannot ship without a quality-check photo', async ({ assert }) => {
    const { job, maker } = await inProduction()
    await svc.markProduced(job.id, maker.profile.id)
    await assert.rejects(
      () => svc.markShipped(job.id, maker.profile.id, { carrier: 'x', trackingNumber: 'y' }),
      /at least one photo/
    )
    await addQcPhoto(job.id)
    const done = await svc.markShipped(job.id, maker.profile.id, {
      carrier: 'x',
      trackingNumber: 'y',
    })
    assert.equal(done.status, 'shipped')
  })

  test('cannot ship before producing', async ({ assert }) => {
    const { job, maker } = await inProduction()
    await assert.rejects(
      () => svc.markShipped(job.id, maker.profile.id, { carrier: 'x', trackingNumber: 'y' }),
      FulfillmentError
    )
  })

  test('another manufacturer cannot touch the job', async ({ assert }) => {
    const { job } = await inProduction()
    const other = await createManufacturer()
    await assert.rejects(() => svc.markProduced(job.id, other.profile.id), FulfillmentError)
  })

  test('buyer confirms delivery; only the buyer can', async ({ assert }) => {
    const { order, buyer, maker } = await shipped()

    await assert.rejects(() => svc.markDeliveredByBuyer(order.id, maker.user.id), FulfillmentError)

    await svc.markDeliveredByBuyer(order.id, buyer.id)
    const fresh = await Order.query().where('id', order.id).preload('productionJobs').firstOrFail()
    assert.equal(fresh.status, 'delivered')
    assert.isNotNull(fresh.deliveredAt)
    assert.equal(fresh.productionJobs[0].status, 'delivered')
  })

  test('auto-confirm completes delivered orders only after the window', async ({ assert }) => {
    const { order, buyer } = await shipped()
    await svc.markDeliveredByBuyer(order.id, buyer.id)

    assert.deepEqual(await svc.runAutoTransitions(DateTime.now().plus({ days: 6 })), {
      delivered: 0,
      completed: 0,
    })
    assert.equal(await orderStatus(order.id), 'delivered')

    const result = await svc.runAutoTransitions(DateTime.now().plus({ days: 7, minutes: 1 }))
    assert.equal(result.completed, 1)
    assert.equal(await orderStatus(order.id), 'completed')

    // idempotent
    assert.deepEqual(await svc.runAutoTransitions(DateTime.now().plus({ days: 30 })), {
      delivered: 0,
      completed: 0,
    })
  })

  test('shipped orders are auto-delivered after 14 days without confirmation', async ({
    assert,
  }) => {
    const { order } = await shipped()

    await svc.runAutoTransitions(DateTime.now().plus({ days: 13 }))
    assert.equal(await orderStatus(order.id), 'shipped')

    await svc.runAutoTransitions(DateTime.now().plus({ days: 14, minutes: 1 }))
    assert.equal(await orderStatus(order.id), 'delivered')
  })

  test('disputed orders are never auto-completed', async ({ assert }) => {
    const { order, buyer } = await shipped()
    await svc.markDeliveredByBuyer(order.id, buyer.id)
    await new OrderStateMachine().transition(order.id, 'disputed', { actorId: buyer.id })

    const result = await svc.runAutoTransitions(DateTime.now().plus({ days: 30 }))
    assert.equal(result.completed, 0)
    assert.equal(await orderStatus(order.id), 'disputed')
  })

  test('buyer can complete early, but not before delivery', async ({ assert }) => {
    const { order, buyer } = await shipped()
    await assert.rejects(() => svc.completeByBuyer(order.id, buyer.id), InvalidOrderTransitionError)

    await svc.markDeliveredByBuyer(order.id, buyer.id)
    await svc.completeByBuyer(order.id, buyer.id)
    assert.equal(await orderStatus(order.id), 'completed')
  })

  test('review: once, 1-5, only after delivery, only by buyer', async ({ assert }) => {
    const { order, buyer, maker } = await shipped()

    await assert.rejects(() => svc.review(order.id, buyer.id, 5, null), FulfillmentError)
    await svc.markDeliveredByBuyer(order.id, buyer.id)

    await assert.rejects(() => svc.review(order.id, buyer.id, 6, null), FulfillmentError)
    await assert.rejects(() => svc.review(order.id, maker.user.id, 5, null), FulfillmentError)

    const job = await svc.review(order.id, buyer.id, 4, '  good print ')
    assert.equal(job.rating, 4)
    assert.equal(job.reviewComment, 'good print')

    await assert.rejects(() => svc.review(order.id, buyer.id, 5, null), FulfillmentError)
  })

  test('SLA report: overdue after due_at, critical after 2× SLA', async ({ assert }) => {
    const { job } = await inProduction()
    const fresh = await ProductionJob.findOrFail(job.id)

    const onTime = await svc.slaReport(DateTime.now().plus({ days: 4 }))
    assert.notInclude(
      onTime.overdue.map((j) => j.id),
      job.id
    )

    const late = await svc.slaReport(fresh.dueAt.plus({ hours: 1 }))
    assert.include(
      late.overdue.map((j) => j.id),
      job.id
    )
    assert.notInclude(
      late.critical.map((j) => j.id),
      job.id
    )

    const veryLate = await svc.slaReport(fresh.acceptedAt.plus({ days: 10, hours: 1 }))
    assert.include(
      veryLate.critical.map((j) => j.id),
      job.id
    )
  })
})
