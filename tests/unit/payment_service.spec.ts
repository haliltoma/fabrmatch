import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import AuditLog from '#models/audit_log'
import db from '@adonisjs/lucid/services/db'
import PaymentService, { PaymentError } from '#services/payments/payment_service'
import FakePaymentProvider from '#services/payments/fake_provider'
import LedgerService from '#services/payments/ledger_service'
import OrderStateMachine from '#services/orders/order_state_machine'
import { InvalidWebhookSignatureError } from '#services/payments/provider'
import {
  createDraftOrder,
  createUser,
  orderStatus,
  resetDatabase,
  paymentStatus,
} from '#tests/helpers/order_fixtures'

function setup() {
  const provider = new FakePaymentProvider('test-secret')
  const started: number[] = []
  const service = new PaymentService(provider, async (orderId) => {
    started.push(orderId)
  })
  return { provider, service, started, ledger: new LedgerService() }
}

async function checkedOutOrder(ctx: ReturnType<typeof setup>) {
  const { order, buyer } = await createDraftOrder()
  const { payment } = await ctx.service.startCheckout(order.id, buyer.id)
  return { order, buyer, payment }
}

test.group('order money split', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('fee + seller share + manufacturer payable add up to the total exactly', async ({
    assert,
  }) => {
    const seller = await createUser('seller')
    const { order } = await createDraftOrder(undefined, {
      quantity: 3,
      sellerId: seller.id,
      sellerMarginBps: 2000,
    })
    await order.load('items')

    const manufacturerShare = order.items.reduce(
      (sum, i) => sum + i.manufacturerShareMinor * i.quantity,
      0
    )
    assert.isAbove(order.sellerShareMinor, 0)
    assert.isAbove(order.platformFeeMinor, 0)
    assert.equal(
      order.totalMinor - order.platformFeeMinor - order.sellerShareMinor,
      manufacturerShare + order.shippingMinor
    )
  })

  test('a seller margin without a seller goes to the platform', async ({ assert }) => {
    const { order } = await createDraftOrder(undefined, { sellerMarginBps: 2000 })
    assert.equal(order.sellerShareMinor, 0)
  })
})

test.group('PaymentService', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('startCheckout moves draft → awaiting_payment and opens a pending payment', async ({
    assert,
  }) => {
    const ctx = setup()
    const { order, payment } = await checkedOutOrder(ctx)

    assert.equal(await orderStatus(order.id), 'awaiting_payment')
    assert.equal(payment.status, 'pending')
    assert.equal(payment.amountMinor, order.totalMinor)
    assert.lengthOf(ctx.provider.checkouts, 1)
    assert.equal(ctx.provider.checkouts[0].amountMinor, order.totalMinor)
  })

  test("another user can't start checkout for the order", async ({ assert }) => {
    const ctx = setup()
    const { order } = await createDraftOrder()
    const stranger = await createUser('stranger')
    await assert.rejects(
      () => ctx.service.startCheckout(order.id, stranger.id),
      PaymentError as never
    )
  })

  test('successful webhook: payment captured, escrow funded, order paid, matching started', async ({
    assert,
  }) => {
    const ctx = setup()
    const { order, payment } = await checkedOutOrder(ctx)
    const { body, headers } = ctx.provider.signedEvent({
      type: 'payment.succeeded',
      providerRef: payment.providerRef,
      amountMinor: payment.amountMinor,
    })

    const outcome = await ctx.service.handleWebhook(body, headers)

    assert.deepEqual(outcome, { status: 'processed', paidOrderId: order.id })
    assert.equal(await orderStatus(order.id), 'paid')
    assert.equal(await paymentStatus(payment.id), 'succeeded')
    assert.equal(await ctx.ledger.balance('buyer_escrow', { orderId: order.id }), order.totalMinor)
    assert.equal(await ctx.ledger.balance('provider_cash', { orderId: order.id }), order.totalMinor)
    assert.deepEqual(ctx.started, [order.id])
    assert.equal(await ctx.ledger.trialBalance(), 0)
  })

  test('replayed webhook is a no-op (no double ledger, matching started once)', async ({
    assert,
  }) => {
    const ctx = setup()
    const { order, payment } = await checkedOutOrder(ctx)
    const event = ctx.provider.signedEvent({
      eventId: 'evt_replay',
      type: 'payment.succeeded',
      providerRef: payment.providerRef,
      amountMinor: payment.amountMinor,
    })

    const first = await ctx.service.handleWebhook(event.body, event.headers)
    const second = await ctx.service.handleWebhook(event.body, event.headers)
    const third = await ctx.service.handleWebhook(event.body, event.headers)

    assert.equal(first.status, 'processed')
    assert.equal(second.status, 'duplicate')
    assert.equal(third.status, 'duplicate')
    assert.equal(await ctx.ledger.balance('buyer_escrow', { orderId: order.id }), order.totalMinor)
    assert.deepEqual(ctx.started, [order.id])
  })

  test('a different event id for an already-succeeded payment changes nothing', async ({
    assert,
  }) => {
    const ctx = setup()
    const { order, payment } = await checkedOutOrder(ctx)
    for (const eventId of ['evt_a', 'evt_b']) {
      const { body, headers } = ctx.provider.signedEvent({
        eventId,
        type: 'payment.succeeded',
        providerRef: payment.providerRef,
        amountMinor: payment.amountMinor,
      })
      await ctx.service.handleWebhook(body, headers)
    }
    assert.equal(await ctx.ledger.balance('buyer_escrow', { orderId: order.id }), order.totalMinor)
    assert.lengthOf(ctx.started, 1)
  })

  test('bad signature is rejected and leaves no trace', async ({ assert }) => {
    const ctx = setup()
    const { order, payment } = await checkedOutOrder(ctx)
    const { body } = ctx.provider.signedEvent({
      type: 'payment.succeeded',
      providerRef: payment.providerRef,
      amountMinor: payment.amountMinor,
    })

    await assert.rejects(
      () => ctx.service.handleWebhook(body, { 'x-fake-signature': 'deadbeef' }),
      InvalidWebhookSignatureError as never
    )
    await assert.rejects(
      () => ctx.service.handleWebhook(body, {}),
      InvalidWebhookSignatureError as never
    )

    assert.equal(await orderStatus(order.id), 'awaiting_payment')
    assert.equal(await ctx.ledger.balance('buyer_escrow', { orderId: order.id }), 0)
    const [{ count }] = await db.from('payment_webhooks').count('* as count')
    assert.equal(Number(count), 0)
  })

  test('amount mismatch is not applied and is flagged for review (no endless retry)', async ({
    assert,
  }) => {
    const ctx = setup()
    const { order, payment } = await checkedOutOrder(ctx)
    const wrong = ctx.provider.signedEvent({
      eventId: 'evt_mismatch',
      type: 'payment.succeeded',
      providerRef: payment.providerRef,
      amountMinor: payment.amountMinor - 1,
    })
    const outcome = await ctx.service.handleWebhook(wrong.body, wrong.headers)

    assert.equal(outcome.status, 'processed')
    assert.equal(await orderStatus(order.id), 'awaiting_payment')
    assert.equal(await ctx.ledger.balance('buyer_escrow', { orderId: order.id }), 0)
    const flagged = await AuditLog.query().where('action', 'payment.needs_review')
    assert.lengthOf(flagged, 1)
    assert.include(JSON.stringify(flagged[0].meta), 'mismatch')
  })

  test('an unknown payment reference is flagged, not retried forever', async ({ assert }) => {
    const ctx = setup()
    const e = ctx.provider.signedEvent({
      type: 'payment.succeeded',
      providerRef: 'nope',
      amountMinor: 100,
    })
    const outcome = await ctx.service.handleWebhook(e.body, e.headers)
    assert.equal(outcome.status, 'processed')
    assert.lengthOf(await AuditLog.query().where('action', 'payment.needs_review'), 1)
  })

  test('failed payment keeps the order payable; a new checkout can then succeed', async ({
    assert,
  }) => {
    const ctx = setup()
    const { order, buyer, payment } = await checkedOutOrder(ctx)
    const failed = ctx.provider.signedEvent({
      type: 'payment.failed',
      providerRef: payment.providerRef,
      amountMinor: payment.amountMinor,
    })
    await ctx.service.handleWebhook(failed.body, failed.headers)

    assert.equal(await paymentStatus(payment.id), 'failed')
    assert.equal(await orderStatus(order.id), 'awaiting_payment')

    const retry = await ctx.service.startCheckout(order.id, buyer.id)
    const ok = ctx.provider.signedEvent({
      type: 'payment.succeeded',
      providerRef: retry.payment.providerRef,
      amountMinor: retry.payment.amountMinor,
    })
    await ctx.service.handleWebhook(ok.body, ok.headers)
    assert.equal(await orderStatus(order.id), 'paid')
  })

  test('money arriving for a cancelled order is refunded automatically', async ({ assert }) => {
    const ctx = setup()
    const { order, buyer, payment } = await checkedOutOrder(ctx)
    await new OrderStateMachine().transition(order.id, 'cancelled', { actorId: buyer.id })

    const { body, headers } = ctx.provider.signedEvent({
      type: 'payment.succeeded',
      providerRef: payment.providerRef,
      amountMinor: payment.amountMinor,
    })
    await ctx.service.handleWebhook(body, headers)

    assert.equal(await orderStatus(order.id), 'cancelled')
    assert.lengthOf(ctx.started, 0)
    assert.lengthOf(ctx.provider.refunds, 1)
    assert.equal(ctx.provider.refunds[0].amountMinor, order.totalMinor)
    assert.equal(await paymentStatus(payment.id), 'refunded')
    assert.equal(await ctx.ledger.balance('buyer_escrow', { orderId: order.id }), 0)
    assert.equal(await ctx.ledger.balance('refund', { orderId: order.id }), 0)
    assert.equal(await ctx.ledger.balance('provider_cash', { orderId: order.id }), 0)
  })

  test('provider refund failure leaves the debt visible; settling later pays it once', async ({
    assert,
  }) => {
    const ctx = setup()
    const { order, buyer, payment } = await checkedOutOrder(ctx)
    await new OrderStateMachine().transition(order.id, 'cancelled', { actorId: buyer.id })
    ctx.provider.failRefunds = true

    const { body, headers } = ctx.provider.signedEvent({
      type: 'payment.succeeded',
      providerRef: payment.providerRef,
      amountMinor: payment.amountMinor,
    })
    await assert.rejects(() => ctx.service.handleWebhook(body, headers), /refund failed/)
    // the webhook itself committed: money is held and owed back
    assert.equal(await ctx.ledger.balance('refund', { orderId: order.id }), order.totalMinor)

    ctx.provider.failRefunds = false
    assert.equal(await ctx.service.settleRefunds(order.id), order.totalMinor)
    assert.equal(await ctx.service.settleRefunds(order.id), 0)
    assert.lengthOf(ctx.provider.refunds, 1)
    assert.equal(await ctx.ledger.balance('refund', { orderId: order.id }), 0)
    assert.equal(await ctx.ledger.trialBalance(), 0)
  })

  test('simulateSuccess runs the real webhook path (dev helper)', async ({ assert }) => {
    const ctx = setup()
    const { order, buyer } = await createDraftOrder()
    const outcome = await ctx.service.simulateSuccess(order.id, buyer.id)
    assert.equal(outcome.status, 'processed')
    assert.equal(await orderStatus(order.id), 'paid')
    assert.deepEqual(ctx.started, [order.id])
  })
})

test.group('PaymentService hardening', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a late success after a failure event is still applied (money was taken)', async ({
    assert,
  }) => {
    const ctx = setup()
    const { order, payment } = await checkedOutOrder(ctx)
    const failed = ctx.provider.signedEvent({
      type: 'payment.failed',
      providerRef: payment.providerRef,
      amountMinor: payment.amountMinor,
    })
    await ctx.service.handleWebhook(failed.body, failed.headers)
    const late = ctx.provider.signedEvent({
      type: 'payment.succeeded',
      providerRef: payment.providerRef,
      amountMinor: payment.amountMinor,
    })
    await ctx.service.handleWebhook(late.body, late.headers)

    assert.equal(await orderStatus(order.id), 'paid')
    assert.equal(await ctx.ledger.balance('buyer_escrow', { orderId: order.id }), order.totalMinor)
  })

  test('a duplicate checkout that also succeeds is refunded on its own payment', async ({
    assert,
  }) => {
    const ctx = setup()
    const { order, buyer, payment: first } = await checkedOutOrder(ctx)
    const retry = await ctx.service.startCheckout(order.id, buyer.id)
    const second = retry.payment

    for (const p of [first, second]) {
      const e = ctx.provider.signedEvent({
        type: 'payment.succeeded',
        providerRef: p.providerRef,
        amountMinor: p.amountMinor,
      })
      await ctx.service.handleWebhook(e.body, e.headers)
    }

    assert.equal(await orderStatus(order.id), 'paid')
    assert.lengthOf(ctx.provider.refunds, 1)
    assert.equal(ctx.provider.refunds[0].providerRef, second.providerRef)
    assert.equal(await paymentStatus(first.id), 'succeeded')
    assert.equal(await paymentStatus(second.id), 'refunded')
    assert.equal(await ctx.ledger.balance('buyer_escrow', { orderId: order.id }), order.totalMinor)
    assert.equal(await ctx.ledger.balance('refund', { orderId: order.id }), 0)
  })
})

test.group('PaymentService concurrency', (group) => {
  group.each.setup(() => resetDatabase())

  test('the same webhook delivered concurrently is applied exactly once', async ({ assert }) => {
    const ctx = setup()
    const { order, payment } = await checkedOutOrder(ctx)
    const event = ctx.provider.signedEvent({
      eventId: 'evt_race',
      type: 'payment.succeeded',
      providerRef: payment.providerRef,
      amountMinor: payment.amountMinor,
    })

    const results = await Promise.all(
      Array.from({ length: 5 }, () => ctx.service.handleWebhook(event.body, event.headers))
    )

    assert.equal(results.filter((r) => r.status === 'processed').length, 1)
    assert.equal(results.filter((r) => r.status === 'duplicate').length, 4)
    assert.equal(await ctx.ledger.balance('buyer_escrow', { orderId: order.id }), order.totalMinor)
    assert.deepEqual(ctx.started, [order.id])
    assert.equal(await orderStatus(order.id), 'paid')
  })

  test('concurrent refund settlement pays and books each obligation exactly once', async ({
    assert,
  }) => {
    const ctx = setup()
    const { order, buyer, payment } = await checkedOutOrder(ctx)
    await new OrderStateMachine().transition(order.id, 'cancelled', { actorId: buyer.id })
    ctx.provider.failRefunds = true
    const e = ctx.provider.signedEvent({
      type: 'payment.succeeded',
      providerRef: payment.providerRef,
      amountMinor: payment.amountMinor,
    })
    await assert.rejects(() => ctx.service.handleWebhook(e.body, e.headers))
    ctx.provider.failRefunds = false

    const results = await Promise.all(
      Array.from({ length: 4 }, () => ctx.service.settleRefunds(order.id))
    )

    assert.equal(
      results.reduce((a, b) => a + b, 0),
      order.totalMinor
    )
    assert.lengthOf(ctx.provider.refunds, 1)
    assert.equal(await ctx.ledger.balance('refund', { orderId: order.id }), 0)
    assert.equal(await ctx.ledger.balance('provider_cash', { orderId: order.id }), 0)
    assert.equal(await paymentStatus(payment.id), 'refunded')
    assert.equal(await ctx.ledger.trialBalance(), 0)
  })
})
