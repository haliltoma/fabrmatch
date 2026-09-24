import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import ReconciliationService from '#services/payments/reconciliation_service'
import PayoutService from '#services/payments/payout_service'
import LedgerService from '#services/payments/ledger_service'
import FakePaymentProvider from '#services/payments/fake_provider'
import db from '@adonisjs/lucid/services/db'
import { createFundedOrder } from '#tests/helpers/order_fixtures'

test.group('ReconciliationService', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a fully processed order reconciles cleanly', async ({ assert }) => {
    const provider = new FakePaymentProvider()
    const { order } = await createFundedOrder(provider)
    await new PayoutService(provider).release(order.id)
    assert.deepEqual(await new ReconciliationService().run(), [])
  })

  test('an in-flight order (money in escrow, not completed) is fine too', async ({ assert }) => {
    await createFundedOrder(new FakePaymentProvider(), { upTo: 'in_production' })
    assert.deepEqual(await new ReconciliationService().run(), [])
  })

  test('cash the ledger cannot explain is reported', async ({ assert }) => {
    const provider = new FakePaymentProvider()
    const { order } = await createFundedOrder(provider, { upTo: 'in_production' })
    // balanced entries (so the ledger accepts them) but not backed by any payment/payout
    await new LedgerService().post(
      [
        { account: 'provider_cash', direction: 'debit', amountMinor: 777 },
        { account: 'platform_fee', direction: 'credit', amountMinor: 777 },
      ],
      { orderId: order.id }
    )
    const found = await new ReconciliationService().run()
    assert.lengthOf(found, 1)
    assert.equal(found[0].kind, 'cash_mismatch')
    assert.equal(found[0].orderId, order.id)
  })

  test('an unbalanced transaction and a negative balance are reported', async ({ assert }) => {
    const { order } = await createFundedOrder(new FakePaymentProvider(), { upTo: 'in_production' })
    // the DB balance trigger is deferred to COMMIT, which a rolled-back test transaction never reaches
    await db.table('ledger_entries').insert([
      {
        transaction_id: '00000000-0000-4000-8000-000000000001',
        account: 'platform_fee',
        direction: 'debit',
        amount_minor: 500,
        currency: 'TRY',
        order_id: order.id,
        created_at: new Date(),
      },
    ])
    const found = await new ReconciliationService().run()
    const kinds = found.map((d) => d.kind)
    assert.include(kinds, 'unbalanced_transaction')
    assert.include(kinds, 'negative_balance')
  })
})
