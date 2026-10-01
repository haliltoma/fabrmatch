import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import AuditLog from '#models/audit_log'
import MatchOffer from '#models/match_offer'
import OrderService, { OrderInputError } from '#services/orders/order_service'
import { InvalidOrderTransitionError } from '#services/orders/order_state_machine'
import OrderStateMachine from '#services/orders/order_state_machine'
import PaymentService from '#services/payments/payment_service'
import FakePaymentProvider from '#services/payments/fake_provider'
import LedgerService from '#services/payments/ledger_service'
import {
  createDraftOrder,
  createFundedOrder,
  createManufacturer,
  createPrinter,
  createUser,
  orderPaymentStatus,
  orderStatus,
} from '#tests/helpers/order_fixtures'

const ledger = new LedgerService()

function setup() {
  const provider = new FakePaymentProvider()
  const payments = new PaymentService(provider, async () => {})
  return { provider, orders: new OrderService(payments) }
}

test.group('cancel + refund (R0-T3)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('paid order: cancelled, escrow refunded in full, ledger balanced', async ({ assert }) => {
    const { provider, orders } = setup()
    const { order, buyer } = await createFundedOrder(provider, { upTo: 'paid' })

    await orders.cancelByBuyer(order.id, buyer.id)

    assert.equal(await orderStatus(order.id), 'cancelled')
    assert.lengthOf(provider.refunds, 1)
    assert.equal(provider.refunds[0].amountMinor, order.totalMinor)
    assert.equal(await orderPaymentStatus(order.id), 'refunded')
    assert.equal(await ledger.balance('buyer_escrow', { orderId: order.id }), 0)
    assert.equal(await ledger.balance('refund', { orderId: order.id }), 0)
    assert.equal(await ledger.balance('provider_cash', { orderId: order.id }), 0)
    assert.equal(await ledger.trialBalance(), 0)
  })

  test('matching order: pending offers expire so no maker can accept afterwards', async ({
    assert,
  }) => {
    const { provider, orders } = setup()
    const { order, buyer } = await createFundedOrder(provider, { upTo: 'paid' })
    await new OrderStateMachine().transition(order.id, 'matching')
    const { profile } = await createManufacturer()
    const printer = await createPrinter(profile)
    const offer = await MatchOffer.create({
      orderId: order.id,
      manufacturerProfileId: profile.id,
      printerId: printer.id,
      slotDate: DateTime.now().plus({ days: 1 }),
      round: 1,
      score: 0.9,
      isExploration: false,
      status: 'pending',
      expiresAt: DateTime.now().plus({ minutes: 30 }),
    })

    await orders.cancelByBuyer(order.id, buyer.id)

    const reloaded = await MatchOffer.findOrFail(offer.id)
    assert.equal(reloaded.status, 'expired')
    assert.equal(await orderStatus(order.id), 'cancelled')
    assert.lengthOf(provider.refunds, 1)
  })

  test('cannot cancel once a maker is producing; money stays in escrow', async ({ assert }) => {
    const { provider, orders } = setup()
    const { order, buyer } = await createFundedOrder(provider, { upTo: 'in_production' })

    await assert.rejects(
      () => orders.cancelByBuyer(order.id, buyer.id),
      InvalidOrderTransitionError as never
    )
    assert.equal(await orderStatus(order.id), 'in_production')
    assert.equal(await ledger.balance('buyer_escrow', { orderId: order.id }), order.totalMinor)
    assert.lengthOf(provider.refunds, 0)
  })

  test('unpaid drafts cancel without touching the provider', async ({ assert }) => {
    const { provider, orders } = setup()
    const { order, buyer } = await createDraftOrder()
    await orders.cancelByBuyer(order.id, buyer.id)
    assert.equal(await orderStatus(order.id), 'cancelled')
    assert.lengthOf(provider.refunds, 0)
  })

  test('only the buyer can cancel; a second cancel is rejected and refunds once', async ({
    assert,
  }) => {
    const { provider, orders } = setup()
    const { order, buyer } = await createFundedOrder(provider, { upTo: 'paid' })
    const stranger = await createUser('stranger')

    await assert.rejects(
      () => orders.cancelByBuyer(order.id, stranger.id),
      OrderInputError as never
    )
    await orders.cancelByBuyer(order.id, buyer.id)
    await assert.rejects(
      () => orders.cancelByBuyer(order.id, buyer.id),
      InvalidOrderTransitionError as never
    )
    assert.lengthOf(provider.refunds, 1)
  })

  test('provider refund failure keeps the cancel; the debt stays visible and settles later', async ({
    assert,
  }) => {
    const { provider, orders } = setup()
    const payments = new PaymentService(provider, async () => {})
    const { order, buyer } = await createFundedOrder(provider, { upTo: 'paid' })
    provider.failRefunds = true

    await orders.cancelByBuyer(order.id, buyer.id)

    assert.equal(await orderStatus(order.id), 'cancelled')
    assert.equal(await ledger.balance('refund', { orderId: order.id }), order.totalMinor)

    provider.failRefunds = false
    assert.equal(await payments.settleRefunds(order.id), order.totalMinor)
    assert.equal(await ledger.balance('refund', { orderId: order.id }), 0)
    assert.equal(await ledger.trialBalance(), 0)
  })
})

test.group('auto-cancel of unmatched orders (R0-T3)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  async function unmatched(provider: FakePaymentProvider) {
    const { order, buyer } = await createFundedOrder(provider, { upTo: 'paid' })
    const sm = new OrderStateMachine()
    await sm.transition(order.id, 'matching')
    await sm.transition(order.id, 'unmatched')
    return { order, buyer }
  }

  const ageOrder = (orderId: string, days: number) =>
    db
      .from('orders')
      .where('id', orderId)
      .update({ updated_at: DateTime.now().minus({ days }).toSQL() })

  test('only orders unmatched longer than the window are cancelled and refunded', async ({
    assert,
  }) => {
    const { provider, orders } = setup()
    const stale = await unmatched(provider)
    const fresh = await unmatched(provider)
    await ageOrder(stale.order.id, 4)
    await ageOrder(fresh.order.id, 1)

    assert.equal(await orders.autoCancelUnmatched(), 1)

    assert.equal(await orderStatus(stale.order.id), 'cancelled')
    assert.equal(await orderStatus(fresh.order.id), 'unmatched')
    assert.lengthOf(provider.refunds, 1)
    assert.equal(await ledger.balance('buyer_escrow', { orderId: stale.order.id }), 0)

    const log = await AuditLog.query()
      .where('subjectId', stale.order.id)
      .where('action', 'order.transition')
      .orderBy('id', 'desc')
      .firstOrFail()
    assert.isNull(log.actorId)
    assert.equal(log.meta.by, 'system')
  })

  test('sweep is idempotent', async ({ assert }) => {
    const { provider, orders } = setup()
    const { order } = await unmatched(provider)
    await ageOrder(order.id, 5)
    assert.equal(await orders.autoCancelUnmatched(), 1)
    assert.equal(await orders.autoCancelUnmatched(), 0)
    assert.lengthOf(provider.refunds, 1)
  })
})
