import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import fabrmatchConfig from '#config/fabrmatch'
import FraudFlag from '#models/fraud_flag'
import Order from '#models/order'
import type User from '#models/user'
import FraudService from '#services/admin/fraud_service'
import AdminQueueService from '#services/admin/queue_service'
import FakePaymentProvider from '#services/payments/fake_provider'
import PaymentService from '#services/payments/payment_service'
import UserSessionService from '#services/identity/user_session_service'
import OrderStateMachine from '#services/orders/order_state_machine'
import {
  createDraftOrder,
  createFundedOrder,
  createStorefrontProduct,
  createUser,
} from '#tests/helpers/order_fixtures'

const fraud = new FraudService()
const fraudCount = async () => {
  const counts = await new AdminQueueService().counts()
  return counts.fraud
}
const statusOf = async (id: number) => {
  const order = await Order.findOrFail(id)
  return order.status
}
const sessions = new UserSessionService()

async function paidOrder(buyer?: User) {
  const { order, buyer: b } = await createDraftOrder(buyer)
  const sm = new OrderStateMachine()
  await sm.transition(order.id, 'awaiting_payment')
  await sm.transition(order.id, 'paid')
  return { order: await Order.findOrFail(order.id), buyer: b }
}

const oldAccount = async (user: User) => {
  user.createdAt = DateTime.now().minus({ days: 30 })
  await user.save()
}

test.group('fraud rules (R3-T10)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('an ordinary order from an established account raises nothing', async ({ assert }) => {
    const buyer = await createUser('buyer')
    await oldAccount(buyer)
    const { order } = await paidOrder(buyer)
    assert.deepEqual(await fraud.assess(order.id), { hold: false })
    assert.lengthOf(await FraudFlag.query(), 0)
  })

  test('a brand-new account with a big order is held until an admin decides', async ({
    assert,
  }) => {
    const admin = await createUser('admin')
    const { order } = await paidOrder()
    const original = fabrmatchConfig.fraud.newAccountMaxOrderMinor
    fabrmatchConfig.fraud.newAccountMaxOrderMinor = 100
    try {
      assert.deepEqual(await fraud.assess(order.id), { hold: true })
      assert.deepEqual(await fraud.assess(order.id), { hold: true }, 'idempotent')
    } finally {
      fabrmatchConfig.fraud.newAccountMaxOrderMinor = original
    }
    assert.lengthOf(await FraudFlag.query(), 1)
    assert.equal(await fraudCount(), 1)

    assert.isTrue(await fraud.clear(order.id, admin.id), 'paid + cleared → matching may start')
    assert.deepEqual(
      await fraud.assess(order.id),
      { hold: false },
      'the cleared flag does not hold again'
    )
    assert.equal(await fraudCount(), 0)
  })

  test('buyer and seller on the same address is a hold', async ({ assert }) => {
    const buyer = await createUser('buyer')
    await oldAccount(buyer)
    const { sellerUser: seller } = await createStorefrontProduct()
    await sessions.start(buyer.id, { ip: '198.51.100.7', userAgent: null })
    await sessions.start(seller.id, { ip: '198.51.100.7', userAgent: null })
    const { order } = await paidOrder(buyer)
    await Order.query().where('id', order.id).update({ seller_id: seller.id })

    assert.deepEqual(await fraud.assess(order.id), { hold: true })
    const flag = await FraudFlag.firstOrFail()
    assert.equal(flag.rule, 'buyer_seller_same_address')
  })

  test('many buyers behind one address and rapid ordering are reviews, not holds', async ({
    assert,
  }) => {
    const buyer = await createUser('buyer')
    await oldAccount(buyer)
    await sessions.start(buyer.id, { ip: '203.0.113.50', userAgent: null })
    for (let i = 0; i < 2; i++) {
      const other = await createUser('other')
      await sessions.start(other.id, { ip: '203.0.113.50', userAgent: null })
      await paidOrder(other)
    }
    const original = fabrmatchConfig.fraud.ordersPerHour
    fabrmatchConfig.fraud.ordersPerHour = 2
    try {
      await paidOrder(buyer)
      const { order } = await paidOrder(buyer)
      assert.deepEqual(await fraud.assess(order.id), { hold: false })
    } finally {
      fabrmatchConfig.fraud.ordersPerHour = original
    }
    const all = await FraudFlag.query()
    const rules = all.map((f) => f.rule).sort()
    assert.deepEqual(rules, ['order_velocity', 'shared_address_accounts'])
  })

  test('rejecting needs an open flag and marks it rejected', async ({ assert }) => {
    const admin = await createUser('admin')
    const { order } = await paidOrder()
    await assert.rejects(() => fraud.reject(order.id, admin.id), /open flags/)
    await FraudFlag.create({
      orderId: order.id,
      rule: 'x',
      severity: 'hold',
      detail: 'x',
      status: 'open',
    })
    await fraud.reject(order.id, admin.id)
    const flag = await FraudFlag.firstOrFail()
    assert.equal(flag.status, 'rejected')
    assert.equal(flag.resolvedBy, admin.id)
  })

  test('a held order does not start matching after payment; a clean one does', async ({
    assert,
  }) => {
    const provider = new FakePaymentProvider('s')
    const started: number[] = []
    const payments = new PaymentService(provider, async (id) => {
      started.push(id)
    })

    const clean = await createFundedOrder(provider, { upTo: 'paid' })
    const original = fabrmatchConfig.fraud.newAccountMaxOrderMinor
    fabrmatchConfig.fraud.newAccountMaxOrderMinor = 100
    try {
      const { order: draft, buyer } = await createDraftOrder()
      await payments.startCheckout(draft.id, buyer.id)
      const evt = provider.signedEvent({
        type: 'payment.succeeded',
        providerRef: provider.checkouts[provider.checkouts.length - 1].providerRef,
        amountMinor: draft.totalMinor,
      })
      const outcome = await payments.handleWebhook(evt.body, evt.headers)
      assert.equal(outcome.status, 'processed')
      assert.notInclude(started, draft.id, 'held before matching')
      assert.equal(await statusOf(draft.id), 'paid')
    } finally {
      fabrmatchConfig.fraud.newAccountMaxOrderMinor = original
    }
    assert.isDefined(clean.order)
  })
})
