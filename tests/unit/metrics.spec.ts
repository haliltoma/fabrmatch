import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import MetricsService from '#services/admin/metrics_service'
import DisputeService from '#services/disputes/dispute_service'
import FakePaymentProvider from '#services/payments/fake_provider'
import PayoutService from '#services/payments/payout_service'
import { createFundedOrder } from '#tests/helpers/order_fixtures'

test.group('MetricsService (R3-T8)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  const metrics = new MetricsService()

  test('an empty marketplace reports zeros and nulls, with a full day series', async ({
    assert,
  }) => {
    const m = await metrics.compute(7)
    assert.equal(m.paidOrders, 0)
    assert.equal(m.gmvMinor, 0)
    assert.isNull(m.disputeRate)
    assert.isNull(m.medianMatchMinutes)
    assert.lengthOf(m.daily, 8)
  })

  test('paid orders, commission and completion are counted from real records', async ({
    assert,
  }) => {
    const provider = new FakePaymentProvider()
    const done = await createFundedOrder(provider, { upTo: 'completed' })
    await new PayoutService(provider).release(done.order.id)
    await createFundedOrder(provider, { upTo: 'in_production' })

    const m = await metrics.compute(30)
    assert.equal(m.paidOrders, 2)
    assert.equal(m.completedOrders, 1)
    assert.isAbove(m.gmvMinor, done.order.totalMinor)
    assert.equal(m.commissionMinor, done.order.platformFeeMinor)
    const today = m.daily[m.daily.length - 1]
    assert.equal(today.orders, 2)
    assert.equal(today.gmvMinor, m.gmvMinor)
    assert.isNotNull(m.newMakerShare)
    assert.equal(m.newMakerShare, 1, 'both makers were created just now')
  })

  test('dispute rate is disputed orders over delivered orders', async ({ assert }) => {
    const provider = new FakePaymentProvider()
    const a = await createFundedOrder(provider, { upTo: 'delivered' })
    await createFundedOrder(provider, { upTo: 'delivered' })
    await new DisputeService().open(a.order.id, a.buyer.id, 'Arrived broken, see photos')
    const m = await metrics.compute(30)
    assert.equal(m.disputeRate, 0.5)
  })
})
