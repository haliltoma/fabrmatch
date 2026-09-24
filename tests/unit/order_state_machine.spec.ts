import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import OrderStateMachine, {
  InvalidOrderTransitionError,
  ORDER_TRANSITIONS,
} from '#services/orders/order_state_machine'
import OrderService from '#services/orders/order_service'
import AuditLog from '#models/audit_log'
import Order from '#models/order'
import type { OrderStatus } from '#models/order'
import db from '@adonisjs/lucid/services/db'
import { createDraftOrder, orderStatus } from '#tests/helpers/order_fixtures'

const HAPPY_PATH: OrderStatus[] = [
  'awaiting_payment',
  'paid',
  'matching',
  'in_production',
  'shipped',
  'delivered',
  'completed',
]

test.group('OrderStateMachine', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('createDraft stores totals as integers and encrypts address', async ({ assert }) => {
    const { order } = await createDraftOrder(undefined, { quantity: 3 })
    await order.load('items')

    assert.equal(order.status, 'draft')
    assert.match(order.code, /^FO-[A-Z2-9]{8}$/)
    assert.isTrue(Number.isInteger(order.totalMinor))
    assert.equal(order.subtotalMinor + order.shippingMinor, order.totalMinor)
    assert.equal(order.items[0].quantity, 3)
    assert.notInclude(order.shippingAddressEnc!, 'Ali Veli')

    const address = new OrderService().decryptShippingAddress(order)
    assert.equal(address?.fullName, 'Ali Veli')
  })

  test('happy path walks draft → completed with an audit entry per step', async ({ assert }) => {
    const { order, buyer } = await createDraftOrder()
    const sm = new OrderStateMachine()

    for (const to of HAPPY_PATH) {
      await sm.transition(order.id, to, { actorId: buyer.id })
    }

    const fresh = await Order.findOrFail(order.id)
    assert.equal(fresh.status, 'completed')
    assert.isNotNull(fresh.deliveredAt)
    assert.isNotNull(fresh.completedAt)

    const logs = await AuditLog.query()
      .where('subjectType', 'order')
      .where('subjectId', order.id)
      .orderBy('id')
    assert.lengthOf(logs, HAPPY_PATH.length)
    assert.deepEqual(logs[0].meta, { from: 'draft', to: 'awaiting_payment' })
    assert.equal(logs[0].actorId, buyer.id)
  })

  test('invalid transition throws and leaves no trace', async ({ assert }) => {
    const { order } = await createDraftOrder()
    const sm = new OrderStateMachine()

    await assert.rejects(() => sm.transition(order.id, 'shipped'), InvalidOrderTransitionError)

    const fresh = await Order.findOrFail(order.id)
    assert.equal(fresh.status, 'draft')
    const logs = await AuditLog.query().where('subjectId', order.id).where('subjectType', 'order')
    assert.lengthOf(logs, 0)
  })

  test('cancel allowed until a maker accepted (refund handled by OrderService)', async ({
    assert,
  }) => {
    const sm = new OrderStateMachine()

    const { order: a } = await createDraftOrder()
    await sm.transition(a.id, 'cancelled')
    assert.equal(await orderStatus(a.id), 'cancelled')

    const { order: b } = await createDraftOrder()
    await sm.transition(b.id, 'awaiting_payment')
    await sm.transition(b.id, 'paid')
    await sm.transition(b.id, 'cancelled')
    assert.equal(await orderStatus(b.id), 'cancelled')

    const { order: c } = await createDraftOrder()
    for (const to of ['awaiting_payment', 'paid', 'matching', 'in_production'] as const) {
      await sm.transition(c.id, to)
    }
    await assert.rejects(() => sm.transition(c.id, 'cancelled'), InvalidOrderTransitionError)
  })

  test('terminal states have no outgoing transitions', ({ assert }) => {
    for (const s of ['completed', 'resolved', 'cancelled'] as OrderStatus[]) {
      assert.lengthOf(ORDER_TRANSITIONS[s], 0)
    }
  })

  test('every transition target is a known state', ({ assert }) => {
    const states = Object.keys(ORDER_TRANSITIONS)
    for (const targets of Object.values(ORDER_TRANSITIONS)) {
      for (const t of targets) assert.include(states, t)
    }
  })

  test('transition inside caller transaction rolls back with it', async ({ assert }) => {
    const { order } = await createDraftOrder()
    const sm = new OrderStateMachine()

    await assert.rejects(() =>
      db.transaction(async (trx) => {
        await sm.transition(order.id, 'awaiting_payment', { trx })
        throw new Error('boom')
      })
    )

    assert.equal(await orderStatus(order.id), 'draft')
  })
})
