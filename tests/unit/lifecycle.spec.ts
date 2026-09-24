import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import Notification from '#models/notification'
import Order from '#models/order'
import ProductionJob from '#models/production_job'
import LifecycleService from '#services/notifications/lifecycle_service'
import FakePaymentProvider from '#services/payments/fake_provider'
import {
  createDraftOrder,
  createFundedOrder,
  createManufacturer,
  createPrinter,
  createUser,
} from '#tests/helpers/order_fixtures'

const LIFECYCLE = ['welcome', 'payment_reminder', 'review_request', 'capacity_idle']
const typesOf = async (userId: number) => {
  const rows = await Notification.query().where('userId', userId).whereIn('type', LIFECYCLE)
  return rows.map((n) => n.type)
}

test.group('lifecycle notifications (M3-T2)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  const lifecycle = new LifecycleService()

  test('welcome is sent once per user', async ({ assert }) => {
    const user = await createUser('new')
    await lifecycle.welcome(user.id)
    await lifecycle.welcome(user.id)
    assert.deepEqual(await typesOf(user.id), ['welcome'])
  })

  test('an order unpaid for a day gets exactly one reminder; fresh and stale ones do not', async ({
    assert,
  }) => {
    const buyer = await createUser('buyer')
    const fresh = await createDraftOrder(buyer)
    const due = await createDraftOrder(buyer)
    const stale = await createDraftOrder(buyer)
    const now = DateTime.now()
    for (const [id, hoursAgo] of [
      [fresh.order.id, 2],
      [due.order.id, 30],
      [stale.order.id, 100],
    ] as const) {
      await Order.query()
        .where('id', id)
        .update({ status: 'awaiting_payment', updated_at: now.minus({ hours: hoursAgo }).toSQL() })
    }
    assert.equal(await lifecycle.paymentReminders(now), 1)
    assert.equal(await lifecycle.paymentReminders(now), 0, 'the sweep is idempotent')
    const [note] = await Notification.query().where('userId', buyer.id)
    assert.equal(note.type, 'payment_reminder')
    assert.include(note.title, due.order.code)
  })

  test('a review request goes out three days after delivery unless reviewed or disputed', async ({
    assert,
  }) => {
    const provider = new FakePaymentProvider()
    const waiting = await createFundedOrder(provider, { upTo: 'delivered' })
    const reviewed = await createFundedOrder(provider, { upTo: 'delivered' })
    const tooSoon = await createFundedOrder(provider, { upTo: 'delivered' })
    const now = DateTime.now()
    await Order.query()
      .whereIn('id', [waiting.order.id, reviewed.order.id])
      .update({ delivered_at: now.minus({ days: 4 }).toSQL() })
    await ProductionJob.query().where('orderId', reviewed.order.id).update({ rating: 5 })
    await Order.query()
      .where('id', tooSoon.order.id)
      .update({ delivered_at: now.minus({ days: 1 }).toSQL() })

    assert.equal(await lifecycle.reviewRequests(now), 1)
    assert.deepEqual(await typesOf(waiting.buyer.id), ['review_request'])
    assert.deepEqual(await typesOf(reviewed.buyer.id), [])
    assert.deepEqual(await typesOf(tooSoon.buyer.id), [])
    assert.equal(await lifecycle.reviewRequests(now), 0)
  })

  test('makers with printers but no free hours are nudged once a week; those with capacity are not', async ({
    assert,
  }) => {
    const idle = await createManufacturer()
    await createPrinter(idle.profile, { slotMinutes: 0 })
    const busy = await createManufacturer()
    await createPrinter(busy.profile)
    const now = DateTime.now()

    assert.equal(await lifecycle.idleCapacity(now), 1)
    assert.deepEqual(await typesOf(idle.user.id), ['capacity_idle'])
    assert.deepEqual(await typesOf(busy.user.id), [])
    assert.equal(await lifecycle.idleCapacity(now), 0)
    await lifecycle.idleCapacity(now.plus({ days: 7 }))
    assert.deepEqual(
      await typesOf(idle.user.id),
      ['capacity_idle', 'capacity_idle'],
      'the next week nudges again'
    )
  })

  test('sweep runs all three', async ({ assert }) => {
    const result = await lifecycle.sweep()
    assert.deepEqual(Object.keys(result), ['paymentReminders', 'reviewRequests', 'idleCapacity'])
  })
})
