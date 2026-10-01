import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'
import MarginPreviewService from '#services/catalog/margin_preview_service'
import SellerAnalyticsService from '#services/catalog/seller_analytics_service'
import OrderService from '#services/orders/order_service'
import OrderStateMachine from '#services/orders/order_state_machine'
import {
  TR_ADDRESS,
  createStorefrontProduct,
  createUser,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'
import { uid } from '#tests/helpers/ids'

test.group('margin preview and seller analytics (R4-T7)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('a higher margin raises the price and the seller’s take, never the cost', async ({
    assert,
  }) => {
    const { catalog } = await createStorefrontProduct()
    const service = new MarginPreviewService()
    const low = await service.preview(catalog.id, 1000)
    const high = await service.preview(catalog.id, 3000)
    assert.isAbove(low.length, 0)
    for (const [i, option] of low.entries()) {
      assert.equal(option.material, high[i].material)
      assert.isAbove(high[i].sellerEarnsMinor, option.sellerEarnsMinor)
      assert.isAbove(high[i].buyerPriceMinor, option.buyerPriceMinor)
      assert.equal(high[i].costMinor, option.costMinor, 'cost does not depend on the margin')
      assert.equal(option.costMinor + option.sellerEarnsMinor, option.buyerPriceMinor)
    }
    const zero = await service.preview(catalog.id, 0)
    assert.equal(zero[0].sellerEarnsMinor, 0)
  })

  test('nonsense input and unknown products preview nothing', async ({ assert }) => {
    const { catalog } = await createStorefrontProduct()
    const service = new MarginPreviewService()
    assert.deepEqual(await service.preview(catalog.id, -5), [])
    assert.deepEqual(await service.preview(catalog.id, 99999), [])
    assert.deepEqual(await service.preview(uid(999999), 1000), [])
  })

  test('analytics counts a seller’s storefront orders, earnings only when completed', async ({
    assert,
  }) => {
    const { product, sellerUser } = await createStorefrontProduct()
    const stranger = await createStorefrontProduct()
    const buyer = await createUser('buyer')
    const orders = new OrderService()
    const sm = new OrderStateMachine()

    const done = await orders.createStorefrontDraft(buyer, product.id, {
      material: 'PLA',
      quantity: 2,
      shippingAddress: TR_ADDRESS,
    })
    for (const to of [
      'awaiting_payment',
      'paid',
      'matching',
      'in_production',
      'shipped',
      'delivered',
      'completed',
    ] as const) {
      await sm.transition(done.id, to)
    }
    const running = await orders.createStorefrontDraft(buyer, product.id, {
      material: 'PLA',
      quantity: 1,
      shippingAddress: TR_ADDRESS,
    })
    await sm.transition(running.id, 'awaiting_payment')
    await sm.transition(running.id, 'paid')
    await orders.createStorefrontDraft(buyer, stranger.product.id, {
      material: 'PLA',
      quantity: 1,
      shippingAddress: TR_ADDRESS,
    })

    const a = await new SellerAnalyticsService().forSeller(sellerUser.id, 30)
    assert.equal(a.ordersPlaced, 2, 'the draft and the other seller’s order are not counted')
    assert.equal(a.ordersCompleted, 1)
    assert.deepEqual(a.earned, [{ currency: 'TRY', minor: done.sellerShareMinor }])
    assert.deepEqual(a.pending, [{ currency: 'TRY', minor: running.sellerShareMinor }])
    assert.equal(a.products[0].title, product.title)
    assert.equal(a.products[0].units, 3)
    assert.deepEqual(a.products[0].earned, [{ currency: 'TRY', minor: done.sellerShareMinor }])

    // an order in another currency is reported on its own line, never added to the lira figures
    await db.from('orders').where('id', running.id).update({ currency: 'USD' })
    const mixed = await new SellerAnalyticsService().forSeller(sellerUser.id, 30)
    assert.deepEqual(mixed.earned, [{ currency: 'TRY', minor: done.sellerShareMinor }])
    assert.deepEqual(mixed.pending, [{ currency: 'USD', minor: running.sellerShareMinor }])
    assert.equal(mixed.ordersPlaced, 2)

    const other = await new SellerAnalyticsService().forSeller(stranger.sellerUser.id, 30)
    assert.equal(other.ordersPlaced, 0, 'a draft is not a sale')
  })
})

test.group('sample orders (R4-T8)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('a seller gets their own design at cost: no margin, no seller share, channel sample', async ({
    assert,
  }) => {
    const { product, sellerUser } = await createStorefrontProduct()
    const orders = new OrderService()
    const sample = await orders.createSampleDraft(sellerUser, product.id, {
      material: 'PLA',
      shippingAddress: TR_ADDRESS,
    })
    assert.equal(sample.channel, 'sample')
    assert.equal(sample.buyerId, sellerUser.id)
    assert.isNull(sample.sellerId)
    assert.equal(sample.sellerShareMinor, 0)

    const buyer = await createUser('buyer')
    const sold = await orders.createStorefrontDraft(buyer, product.id, {
      material: 'PLA',
      quantity: 1,
      shippingAddress: TR_ADDRESS,
    })
    assert.isBelow(sample.totalMinor, sold.totalMinor, 'the sample is cheaper by the margin')
  })

  test('only the owner can order a sample; unavailable materials are refused', async ({
    assert,
  }) => {
    const { product, sellerUser } = await createStorefrontProduct({ materials: ['PLA'] })
    const stranger = await createUser('stranger')
    const orders = new OrderService()
    await assert.rejects(
      () =>
        orders.createSampleDraft(stranger, product.id, {
          material: 'PLA',
          shippingAddress: TR_ADDRESS,
        }),
      /not found/
    )
    await assert.rejects(
      () =>
        orders.createSampleDraft(sellerUser, product.id, {
          material: 'ABS',
          shippingAddress: TR_ADDRESS,
        }),
      /not available/
    )
  })

  test('samples do not count as sales in the seller analytics', async ({ assert }) => {
    const { product, sellerUser } = await createStorefrontProduct()
    const sample = await new OrderService().createSampleDraft(sellerUser, product.id, {
      material: 'PLA',
      shippingAddress: TR_ADDRESS,
    })
    const sm = new OrderStateMachine()
    await sm.transition(sample.id, 'awaiting_payment')
    await sm.transition(sample.id, 'paid')
    const a = await new SellerAnalyticsService().forSeller(sellerUser.id, 30)
    assert.equal(a.ordersPlaced, 0)
  })
})
