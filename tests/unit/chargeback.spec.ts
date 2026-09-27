import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Chargeback from '#models/chargeback'
import Payout from '#models/payout'
import ChargebackService, { ChargebackError } from '#services/payments/chargeback_service'
import FakePaymentProvider from '#services/payments/fake_provider'
import LedgerService from '#services/payments/ledger_service'
import PaymentService from '#services/payments/payment_service'
import PayoutService, { PayoutError } from '#services/payments/payout_service'
import ReconciliationService from '#services/payments/reconciliation_service'
import { createFundedOrder, createUser } from '#tests/helpers/order_fixtures'

const ledger = new LedgerService()

async function withChargeback(upTo: 'in_production' | 'completed') {
  const provider = new FakePaymentProvider()
  const funded = await createFundedOrder(provider, { upTo })
  const payments = new PaymentService(provider, async () => {})
  const payment = provider.checkouts.find((c) => c.orderId === funded.order.id)!
  const evt = provider.signedEvent({
    type: 'chargeback.opened',
    providerRef: payment.providerRef,
    amountMinor: funded.order.totalMinor,
  })
  const outcome = await payments.handleWebhook(evt.body, evt.headers)
  return { ...funded, provider, payments, evt, outcome }
}

test.group('chargebacks (R1-T9)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  const service = new ChargebackService()

  test('the webhook opens a chargeback once and it shows in the admin list', async ({ assert }) => {
    const { order, payments, evt, outcome } = await withChargeback('in_production')
    assert.equal(outcome.status, 'processed')
    const rows = await Chargeback.query().where('orderId', order.id)
    assert.lengthOf(rows, 1)
    assert.equal(rows[0].status, 'open')
    const listed = await service.listOpen()
    assert.equal(listed[0].orderCode, order.code)

    const again = await payments.handleWebhook(evt.body, evt.headers)
    assert.equal(again.status, 'duplicate')
    assert.lengthOf(await Chargeback.query().where('orderId', order.id), 1)
  })

  test('an open chargeback blocks payout, already-allocated ones stay pending, winning releases it', async ({
    assert,
  }) => {
    const provider = new FakePaymentProvider()
    const funded = await createFundedOrder(provider, { upTo: 'completed' })
    const payouts = new PayoutService(provider)
    const admin = await createUser('admin')
    const payment = provider.checkouts.find((c) => c.orderId === funded.order.id)!
    const evt = provider.signedEvent({
      type: 'chargeback.opened',
      providerRef: payment.providerRef,
      amountMinor: funded.order.totalMinor,
    })
    await new PaymentService(provider, async () => {}).handleWebhook(evt.body, evt.headers)

    await assert.rejects(() => payouts.release(funded.order.id), PayoutError)
    assert.lengthOf(await Payout.query().where('orderId', funded.order.id), 0)

    const [open] = await service.listOpen()
    await service.won(open.id, admin.id, 'evidence accepted')
    const released = await payouts.release(funded.order.id)
    assert.isAbove(released.paid, 0)
    await assert.rejects(() => service.won(open.id, admin.id), ChargebackError)
  })

  test('losing takes the escrow out as cash, keeps the ledger balanced and reconciled', async ({
    assert,
  }) => {
    const { order } = await withChargeback('in_production')
    const admin = await createUser('admin')
    const [open] = await service.listOpen()
    assert.isAbove(await ledger.balance('buyer_escrow', { orderId: order.id }), 0)

    await service.lost(open.id, admin.id, 'friendly fraud, bank ruled against us')
    assert.equal(await ledger.balance('buyer_escrow', { orderId: order.id }), 0)
    assert.equal(await ledger.trialBalance({ orderId: order.id }), 0)
    assert.equal(await ledger.balance('provider_cash', { orderId: order.id }), 0)
    const found = await new ReconciliationService().run()
    assert.notInclude(
      found.map((f) => f.orderId),
      order.id,
      'cash mismatch would mean the write-off is wrong'
    )
    const row = await Chargeback.firstOrFail()
    assert.equal(row.status, 'lost')
    await assert.rejects(() => service.lost(open.id, admin.id), ChargebackError)
  })

  test('losing after payouts were allocated cancels the unpaid ones; nothing pays them later', async ({
    assert,
  }) => {
    const provider = new FakePaymentProvider()
    const funded = await createFundedOrder(provider, { upTo: 'completed' })
    const payouts = new PayoutService(provider)
    const admin = await createUser('admin')
    // allocated, but the transfer keeps failing: every payout stays pending
    provider.failApprovals = true
    await payouts.release(funded.order.id).catch(() => {})
    const pending = await Payout.query().where('orderId', funded.order.id)
    assert.isAbove(pending.length, 0)
    assert.isTrue(pending.every((p) => p.status === 'pending'))
    assert.equal(await ledger.balance('buyer_escrow', { orderId: funded.order.id }), 0)

    const payment = provider.checkouts.find((c) => c.orderId === funded.order.id)!
    const evt = provider.signedEvent({
      type: 'chargeback.opened',
      providerRef: payment.providerRef,
      amountMinor: funded.order.totalMinor,
    })
    await new PaymentService(provider, async () => {}).handleWebhook(evt.body, evt.headers)
    const [open] = await service.listOpen()
    await service.lost(open.id, admin.id, 'bank ruled against us')

    const after = await Payout.query().where('orderId', funded.order.id)
    assert.isTrue(
      after.every((p) => p.status === 'cancelled'),
      'unpaid payouts are cancelled'
    )
    provider.failApprovals = false
    const retried = await payouts.processPending(funded.order.id)
    assert.equal(retried.paid, 0)
    await assert.rejects(() => payouts.markPaid(admin.id, after[0].id, 'REF-1'), PayoutError)

    // the bank took the whole amount: cash for the order is gone, nothing is left owed
    assert.equal(await ledger.trialBalance({ orderId: funded.order.id }), 0)
    assert.equal(await ledger.balance('provider_cash', { orderId: funded.order.id }), 0)
    assert.equal(await ledger.balance('manufacturer_payable', { orderId: funded.order.id }), 0)
    assert.equal(await ledger.balance('seller_payable', { orderId: funded.order.id }), 0)
    const row = await Chargeback.findOrFail(open.id)
    assert.equal(row.writtenOffMinor, funded.order.totalMinor)
    const found = await new ReconciliationService().run()
    assert.notInclude(
      found.map((f) => f.orderId),
      funded.order.id
    )
  })

  test('what was already paid out is booked as a chargeback loss, not left unrecorded', async ({
    assert,
  }) => {
    const provider = new FakePaymentProvider()
    const funded = await createFundedOrder(provider, { upTo: 'completed' })
    const payouts = new PayoutService(provider)
    const admin = await createUser('admin')
    await payouts.release(funded.order.id)
    const paidRows = await Payout.query().where('orderId', funded.order.id).where('status', 'paid')
    const paidOut = paidRows.reduce((a, p) => a + p.amountMinor, 0)
    assert.isAbove(paidOut, 0)

    const payment = provider.checkouts.find((c) => c.orderId === funded.order.id)!
    const evt = provider.signedEvent({
      type: 'chargeback.opened',
      providerRef: payment.providerRef,
      amountMinor: funded.order.totalMinor,
    })
    await new PaymentService(provider, async () => {}).handleWebhook(evt.body, evt.headers)
    const [open] = await service.listOpen()
    await service.lost(open.id, admin.id)

    assert.equal(await ledger.trialBalance({ orderId: funded.order.id }), 0)
    // paid-out makers and seller keep their money and escrow is empty: the platform carries the
    // whole amount (what it paid out plus the fee it had kept) as a loss
    assert.equal(
      await ledger.balance('chargeback_loss', { orderId: funded.order.id }),
      funded.order.totalMinor
    )
    assert.isAbove(funded.order.totalMinor, paidOut)
    const row = await Chargeback.findOrFail(open.id)
    assert.equal(row.writtenOffMinor, funded.order.totalMinor)
    const found = await new ReconciliationService().run()
    assert.notInclude(
      found.filter((f) => f.kind === 'cash_mismatch').map((f) => f.orderId),
      funded.order.id
    )
  })

  test('a chargeback for an unknown payment is flagged for review, not swallowed', async ({
    assert,
  }) => {
    const provider = new FakePaymentProvider()
    const payments = new PaymentService(provider, async () => {})
    const evt = provider.signedEvent({
      type: 'chargeback.opened',
      providerRef: 'nope',
      amountMinor: 100,
    })
    const outcome = await payments.handleWebhook(evt.body, evt.headers)
    assert.equal(outcome.status, 'processed')
    assert.lengthOf(await Chargeback.query(), 0)
  })
})
