import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import OrderService from '#services/orders/order_service'
import OrderStateMachine from '#services/orders/order_state_machine'
import AttentionService from '#services/admin/attention_service'
import {
  TR_ADDRESS,
  createStorefrontProduct,
  createUser,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'

test.group('admin attention', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('lists only work that is waiting, links each kind, and counts it on the menu', async ({
    assert,
  }) => {
    const before = await new AttentionService().summary()
    for (const item of before.items) assert.isAbove(item.count, 0)

    const { product } = await createStorefrontProduct()
    const buyer = await createUser('buyer')
    const order = await new OrderService().createStorefrontDraft(buyer, product.id, {
      material: 'PLA',
      quantity: 1,
      shippingAddress: TR_ADDRESS,
    })
    const sm = new OrderStateMachine()
    for (const to of ['awaiting_payment', 'paid', 'matching', 'unmatched'] as const)
      await sm.transition(order.id, to)

    const after = await new AttentionService().summary()
    const unmatched = after.items.find((i) => i.key === 'unmatched')
    assert.equal(unmatched?.href, '/admin/matching')
    assert.equal(
      unmatched?.count,
      (before.items.find((i) => i.key === 'unmatched')?.count ?? 0) + 1
    )
    assert.equal(after.badges.matching, unmatched?.count)
    assert.isAtLeast(after.badges.queues, after.badges.matching)
  })

  test('money and trust problems come before housekeeping', async ({ assert }) => {
    const order = [
      'disputes',
      'fraud',
      'chargebacks',
      'paymentReviews',
      'unmatched',
      'overdue',
      'payouts',
      'pendingMakers',
      'support',
      'reports',
      'shopPhotos',
      'reconcile',
    ]
    const { items } = await new AttentionService().summary()
    const seen = items.map((i) => order.indexOf(i.key))
    assert.deepEqual(
      seen,
      [...seen].sort((a, b) => a - b)
    )
  })
})
