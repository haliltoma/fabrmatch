import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { splitGross, taxRateFor } from '#services/tax/tax'
import { createDraftOrder, ensureReferenceCatalog } from '#tests/helpers/order_fixtures'

test.group('tax split (R1-T2)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('net plus tax is always exactly the gross (property over many amounts and rates)', ({
    assert,
  }) => {
    for (const rate of [0, 100, 800, 1000, 1800, 2000, 2700]) {
      for (let gross = 0; gross <= 5000; gross += 7) {
        const s = splitGross(gross, rate)
        assert.equal(s.netMinor + s.taxMinor, gross)
        assert.isAtLeast(s.taxMinor, 0)
        assert.isAtMost(s.taxMinor, gross)
      }
    }
  })

  test('known values round half up', ({ assert }) => {
    assert.deepEqual(splitGross(12000, 2000), { rateBps: 2000, taxMinor: 2000, netMinor: 10000 })
    assert.equal(splitGross(100, 2000).taxMinor, 17) // 16.67 → 17
    assert.equal(splitGross(1, 2000).taxMinor, 0) // 0.17 → 0
    assert.equal(splitGross(3, 2000).taxMinor, 1) // 0.5 → 1
    assert.equal(splitGross(999, 0).taxMinor, 0)
  })

  test('bad input is rejected', ({ assert }) => {
    assert.throws(() => splitGross(-1, 2000))
    assert.throws(() => splitGross(1.5, 2000))
    assert.throws(() => splitGross(100, -5))
  })

  test('Türkiye has KDV configured, unknown countries have none', async ({ assert }) => {
    assert.deepEqual(await taxRateFor('tr'), { rateBps: 2000, name: 'KDV' })
    assert.deepEqual(await taxRateFor('DE'), { rateBps: 0, name: null })
  })

  test('an order records the tax contained in its total', async ({ assert }) => {
    const { order } = await createDraftOrder()
    assert.equal(order.taxRateBps, 2000)
    assert.deepEqual(splitGross(order.totalMinor, 2000).taxMinor, order.taxMinor)
    assert.isAbove(order.taxMinor, 0)
    assert.isBelow(order.taxMinor, order.totalMinor)
  })
})
