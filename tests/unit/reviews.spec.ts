import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import ProductionJob from '#models/production_job'
import OrderService from '#services/orders/order_service'
import OrderStateMachine from '#services/orders/order_state_machine'
import ReviewService from '#services/storefront/review_service'
import {
  TR_ADDRESS,
  createManufacturer,
  createPrinter,
  createStorefrontProduct,
  createUser,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'

async function finishedSale(
  productId: number,
  rating: number | null,
  comment: string | null,
  status: 'completed' | 'resolved' = 'completed'
) {
  const buyer = await createUser('buyer')
  const order = await new OrderService().createStorefrontDraft(buyer, productId, {
    material: 'PLA',
    quantity: 1,
    shippingAddress: TR_ADDRESS,
  })
  const maker = await createManufacturer()
  const printer = await createPrinter(maker.profile)
  const sm = new OrderStateMachine()
  await sm.transition(order.id, 'awaiting_payment')
  await sm.transition(order.id, 'paid')
  await sm.transition(order.id, 'matching')
  await ProductionJob.create({
    orderId: order.id,
    manufacturerProfileId: maker.profile.id,
    printerId: printer.id,
    status: 'accepted',
    acceptedAt: DateTime.now(),
    dueAt: DateTime.now().plus({ days: 5 }),
    rating,
    reviewComment: comment,
  })
  for (const to of ['in_production', 'shipped', 'delivered', status] as const)
    await sm.transition(order.id, to)
  return order
}

test.group('product reviews (M3-T3)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())
  const reviews = new ReviewService()

  test('no reviews means nothing to show, not zeros', async ({ assert }) => {
    const { product } = await createStorefrontProduct()
    assert.deepEqual(await reviews.forListing(product.id), { count: 0, average: null, recent: [] })
  })

  test('only completed, rated orders of that listing count; identities never appear', async ({
    assert,
  }) => {
    const { product } = await createStorefrontProduct()
    const other = await createStorefrontProduct()
    await finishedSale(product.id, 5, 'Perfect fit')
    await finishedSale(product.id, 4, null)
    await finishedSale(product.id, null, null) // completed but unrated
    await finishedSale(other.product.id, 1, 'someone else’s listing')

    const r = await reviews.forListing(product.id)
    assert.equal(r.count, 2)
    assert.equal(r.average, 4.5)
    assert.deepEqual(r.recent.map((x) => x.rating).sort(), [4, 5])
    assert.equal(r.recent.find((x) => x.rating === 5)?.comment, 'Perfect fit')
    assert.deepEqual(Object.keys(r.recent[0]).sort(), ['at', 'comment', 'rating'])
  })
})
