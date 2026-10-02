import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import ExternalListing from '#models/external_listing'
import Notification from '#models/notification'
import StorePriceWatch, {
  inShopCurrency,
  priceStatus,
} from '#services/integrations/stores/store_price_watch'
import StoreService from '#services/integrations/stores/store_service'
import { fabrmatchSku } from '#services/integrations/stores/store_adapter'
import { createDraftOrder, createStorefrontProduct } from '#tests/helpers/order_fixtures'
import { DateTime } from 'luxon'
import ExternalOrder from '#models/external_order'
import Order from '#models/order'

test.group('shop price watch (Paket V, V6)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a TRY cost in a foreign shop: mid rate, buffer, up to a whole unit', ({ assert }) => {
    assert.equal(inShopCurrency(12_345, null, 300), 12_345, 'TRY shops are not converted')
    // 1 TRY = 0.025 EUR: 123.45 TRY = 3.09 EUR, +3 % = 3.19 → 4.00
    assert.equal(inShopCurrency(12_345, 25_000_000n, 300), 400)
  })

  test('below cost is a loss, less than half the margin is thin', ({ assert }) => {
    assert.equal(priceStatus(900, 1000, 1200), 'loss')
    assert.equal(priceStatus(1050, 1000, 1200), 'thin')
    assert.equal(priceStatus(1100, 1000, 1200), 'ok')
  })

  test('watch: a shop price below cost is flagged and the seller told once', async ({ assert }) => {
    const { product, sellerUser } = await createStorefrontProduct({ materials: ['PLA'] })
    const stores = new StoreService()
    const shop = await stores.connectTestShop(sellerUser)
    await stores.publish(sellerUser, shop.id, product.id, [{ material: 'PLA', priceMinor: 100 }])

    const watch = new StorePriceWatch()
    const first = await watch.check(shop)
    assert.equal(first.checked, 1)
    assert.equal(first.changed, 1)
    const listing = await ExternalListing.query()
      .where('storeConnectionId', shop.id)
      .where('sellerProductId', product.id)
      .firstOrFail()
    assert.equal(listing.priceStatus, 'loss')
    assert.isAbove(listing.costMinor!, 100)

    // the same state the next day is not news
    const again = await watch.check(shop)
    assert.equal(again.changed, 0)
    const notes = await Notification.query()
      .where('userId', sellerUser.id)
      .where('type', 'store_order')
    assert.lengthOf(notes, 1)
  })

  test('auto: the shop gets cost plus the seller’s margin by itself', async ({ assert }) => {
    const { product, sellerUser } = await createStorefrontProduct({
      materials: ['PLA'],
      marginBps: 2000,
    })
    const stores = new StoreService()
    const shop = await stores.connectTestShop(sellerUser)
    shop.priceMode = 'auto'
    await shop.save()
    await stores.publish(sellerUser, shop.id, product.id, [{ material: 'PLA', priceMinor: 100 }])

    await new StorePriceWatch().check(shop)
    const listing = await ExternalListing.query()
      .where('storeConnectionId', shop.id)
      .where('sellerProductId', product.id)
      .firstOrFail()
    assert.isAbove(listing.priceMinor!, listing.costMinor!, 'now above cost')
    assert.equal(listing.priceStatus, 'ok')
  })

  test('a shop variant carrying our SKU links itself back to the product on sync', async ({
    assert,
  }) => {
    // regression: the SKU key was read as a number since the switch to UUIDs (U7), so a sync of
    // any shop holding our SKUs failed
    const { product, sellerUser } = await createStorefrontProduct({ materials: ['PLA'] })
    const stores = new StoreService()
    const shop = await stores.connectTestShop(sellerUser)
    await stores.publish(sellerUser, shop.id, product.id, [{ material: 'PLA', priceMinor: 5000 }])
    await ExternalListing.query()
      .where('storeConnectionId', shop.id)
      .update({ sellerProductId: null, material: null })

    await stores.syncListings(sellerUser, shop.id)
    const listing = await ExternalListing.query()
      .where('storeConnectionId', shop.id)
      .where('sku', fabrmatchSku(product.id, 'PLA'))
      .firstOrFail()
    assert.equal(listing.sellerProductId, product.id)
    assert.equal(listing.material, 'PLA')
  })

  test('a shop order still waiting for a maker is told to the seller once', async ({ assert }) => {
    const { sellerUser } = await createStorefrontProduct({ materials: ['PLA'] })
    const shop = await new StoreService().connectTestShop(sellerUser)
    const old = await createDraftOrder(sellerUser)
    const fresh = await createDraftOrder(sellerUser)
    for (const [order, hoursAgo] of [
      [old.order, 30],
      [fresh.order, 2],
    ] as const) {
      await Order.query()
        .where('id', order.id)
        .update({
          status: 'matching',
          createdAt: DateTime.now().minus({ hours: hoursAgo }).toSQL(),
        })
      await ExternalOrder.create({
        storeConnectionId: shop.id,
        externalOrderId: `shop-${order.id}`,
        externalOrderName: '#1001',
        orderId: order.id,
        status: 'placed',
        lines: [],
        shippingAddressEnc: 'x',
        fulfillmentStatus: 'none',
        fulfillmentAttempts: 0,
      })
    }
    const watch = new StorePriceWatch()
    await watch.noticeWaitingOrders()
    await watch.noticeWaitingOrders()
    const notes = await Notification.query()
      .where('userId', sellerUser.id)
      .where('type', 'store_order')
    assert.lengthOf(notes, 1, 'only the old order, and only once')
    assert.include(notes[0].title, old.order.code)
  })
})
