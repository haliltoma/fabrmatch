/* eslint-disable @unicorn/no-await-expression-member -- terse assertions read better inline */
import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import fabrmatchConfig from '#config/fabrmatch'
import ExternalListing from '#models/external_listing'
import ExternalOrder from '#models/external_order'
import Notification from '#models/notification'
import Order from '#models/order'
import ProductionJob from '#models/production_job'
import StoreConnection from '#models/store_connection'
import RoleService from '#services/identity/role_service'
import OrderService from '#services/orders/order_service'
import FakeStoreAdapter from '#services/integrations/stores/fake_store_adapter'
import { setStoreAdapter } from '#services/integrations/stores/store_registry'
import StoreService, { MAX_FULFILLMENT_ATTEMPTS } from '#services/integrations/stores/store_service'
import {
  createManufacturer,
  createPrinter,
  createStorefrontProduct,
  createUser,
} from '#tests/helpers/order_fixtures'

const inertia = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }
const flags = fabrmatchConfig.flags as Record<string, number>
const customer = {
  fullName: 'Ayşe Demir',
  line1: 'Bağdat Cd. 200',
  city: 'Istanbul',
  postalCode: '34728',
  country: 'TR',
  phone: '+905551112233',
}

async function shop() {
  const adapter = new FakeStoreAdapter()
  setStoreAdapter('fake', adapter)
  const { product, sellerUser } = await createStorefrontProduct()
  await new RoleService().assignRole(sellerUser, 'seller')
  const stores = new StoreService()
  const connection = await stores.connectTestShop(sellerUser)
  return { adapter, product, seller: sellerUser, stores, connection }
}

function incoming(id: string, variantId = 'v1', quantity = 2) {
  return {
    externalOrderId: id,
    name: `#${id}`,
    lines: [{ variantId, sku: 'VASE-S', title: 'Spiral vase — small', quantity }],
    shippingAddress: customer,
  }
}

test.group('External shops (R4-T3/T4 core)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => {
    flags.externalStores = 1
    return () => {
      flags.externalStores = 0
      setStoreAdapter('fake', null)
    }
  })

  test('an order waits for its SKU to be linked, then becomes a draft the seller pays', async ({
    assert,
  }) => {
    const { product, seller, stores, connection } = await shop()
    assert.lengthOf(await stores.listings(seller, connection.id), 3)

    const first = await stores.importOrder(connection, incoming('1001'))
    assert.isFalse(first.duplicate)
    const waiting = await ExternalOrder.findByOrFail('externalOrderId', '1001')
    assert.equal(waiting.status, 'needs_mapping')
    assert.include(waiting.error!, 'VASE-S')
    assert.notInclude(JSON.stringify(waiting.$attributes), 'Bağdat')

    const listing = await ExternalListing.query()
      .where('storeConnectionId', connection.id)
      .where('externalVariantId', 'v1')
      .firstOrFail()
    await stores.mapListing(seller, listing.id, {
      sellerProductId: product.id,
      material: 'pla',
      color: 'White',
      scalePercent: 100,
    })

    await waiting.refresh()
    assert.equal(waiting.status, 'placed')
    const order = await Order.findOrFail(waiting.orderId!)
    assert.equal(order.buyerId, seller.id)
    assert.equal(order.channel, 'shopify')
    assert.isNull(order.sellerId)
    assert.equal(order.sellerShareMinor, 0)
    assert.equal(order.status, 'draft')
    assert.equal(new OrderService().decryptShippingAddress(order)?.fullName, 'Ayşe Demir')

    // the same order again is recognised, not doubled
    const again = await stores.importOrder(connection, incoming('1001'))
    assert.isTrue(again.duplicate)
    assert.lengthOf(await ExternalOrder.query().where('storeConnectionId', connection.id), 1)
  })

  test('mapping is checked: own product, allowed material and size only', async ({ assert }) => {
    const { product, seller, stores, connection } = await shop()
    const listing = await ExternalListing.query()
      .where('storeConnectionId', connection.id)
      .firstOrFail()
    await assert.rejects(
      () =>
        stores.mapListing(seller, listing.id, {
          sellerProductId: product.id,
          material: 'NYLON',
          color: null,
          scalePercent: 100,
        }),
      /material/
    )
    await assert.rejects(
      () =>
        stores.mapListing(seller, listing.id, {
          sellerProductId: product.id,
          material: 'PLA',
          color: null,
          scalePercent: 250,
        }),
      /size/
    )
    const other = await createStorefrontProduct()
    await assert.rejects(
      () =>
        stores.mapListing(seller, listing.id, {
          sellerProductId: other.product.id,
          material: 'PLA',
          color: null,
          scalePercent: 100,
        }),
      /your own products/
    )
    const stranger = await createUser('seller')
    await assert.rejects(
      () =>
        stores.mapListing(stranger, listing.id, {
          sellerProductId: null,
          material: null,
          color: null,
          scalePercent: null,
        }),
      /Shop not found/
    )
  })

  test('shipping writes the tracking back to the shop once; failures retry, then stop', async ({
    assert,
  }) => {
    const { adapter, product, seller, stores, connection } = await shop()
    const listing = await ExternalListing.query()
      .where('storeConnectionId', connection.id)
      .where('externalVariantId', 'v1')
      .firstOrFail()
    await stores.mapListing(seller, listing.id, {
      sellerProductId: product.id,
      material: 'PLA',
      color: null,
      scalePercent: 100,
    })
    await stores.importOrder(connection, incoming('2002'))
    const external = await ExternalOrder.findByOrFail('externalOrderId', '2002')

    const { profile } = await createManufacturer()
    const printer = await createPrinter(profile)
    await ProductionJob.create({
      orderId: external.orderId!,
      manufacturerProfileId: profile.id,
      printerId: printer.id,
      status: 'shipped',
      acceptedAt: DateTime.now(),
      dueAt: DateTime.now().plus({ days: 5 }),
      carrier: 'Yurtiçi',
      trackingNumber: 'YK998877',
    })
    await stores.orderShipped(external.orderId!)
    await external.refresh()
    assert.equal(external.fulfillmentStatus, 'pending')

    adapter.failFulfillment = true
    const failed = await stores.pushPendingFulfillments()
    assert.deepEqual(failed, { pushed: 0, failed: 1 })
    await external.refresh()
    assert.equal(external.fulfillmentAttempts, 1)
    assert.equal(external.fulfillmentStatus, 'pending')

    adapter.failFulfillment = false
    await stores.pushPendingFulfillments()
    await stores.pushPendingFulfillments()
    await external.refresh()
    assert.equal(external.fulfillmentStatus, 'pushed')
    assert.deepEqual(adapter.fulfillments, [
      { externalOrderId: '2002', carrier: 'Yurtiçi', trackingNumber: 'YK998877' },
    ])

    // a shop that keeps refusing is given up on after the limit, and the seller can retry
    external.merge({
      fulfillmentStatus: 'pending',
      fulfillmentAttempts: MAX_FULFILLMENT_ATTEMPTS - 1,
    })
    await external.save()
    adapter.failFulfillment = true
    await stores.pushPendingFulfillments()
    await external.refresh()
    assert.equal(external.fulfillmentStatus, 'failed')
    await stores.retryFulfillment(seller, external.id)
    await external.refresh()
    assert.equal(external.fulfillmentStatus, 'pending')
  })

  test('webhook: signed per shop, no CSRF, duplicates acknowledged', async ({ client, assert }) => {
    const { adapter, connection } = await shop()
    const { body, headers } = adapter.signedOrder(connection, incoming('3003'))
    const path = `/webhooks/stores/${connection.id}/orders`

    const forged = await client
      .post(path)
      .header('x-fake-store-signature', 'nope')
      .json(JSON.parse(body))
    forged.assertStatus(401)

    const first = await client.post(path).headers(headers).json(JSON.parse(body))
    first.assertStatus(200)
    first.assertBodyContains({ status: 'received' })
    const second = await client.post(path).headers(headers).json(JSON.parse(body))
    second.assertBodyContains({ status: 'duplicate' })

    // a disconnected shop cannot push orders any more
    await StoreConnection.query().where('id', connection.id).update({ status: 'disconnected' })
    const gone = await client.post(path).headers(headers).json(JSON.parse(body))
    gone.assertStatus(404)
    assert.lengthOf(await ExternalOrder.query().where('storeConnectionId', connection.id), 1)
  })

  test('the page is hidden while the feature is off, and shows only the seller’s own shops', async ({
    client,
  }) => {
    const { seller, connection } = await shop()
    const page = await client.get('/seller/stores').headers(inertia).loginAs(seller)
    page.assertBodyContains({
      component: 'seller/stores',
      props: { currentId: connection.id, connections: [{ id: connection.id }] },
    })

    const other = await createStorefrontProduct()
    await new RoleService().assignRole(other.sellerUser, 'seller')
    const theirs = await client
      .get(`/seller/stores?shop=${connection.id}`)
      .headers(inertia)
      .loginAs(other.sellerUser)
    theirs.assertBodyContains({ props: { currentId: null, connections: [] } })

    flags.externalStores = 0
    const hidden = await client.get('/seller/stores').loginAs(seller)
    hidden.assertStatus(404)
  })
})

test.group('External shops: notifications and cancellations', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => {
    flags.externalStores = 1
    return () => {
      flags.externalStores = 0
      setStoreAdapter('fake', null)
    }
  })

  async function linkedShop() {
    const made = await shop()
    const listing = await ExternalListing.query()
      .where('storeConnectionId', made.connection.id)
      .where('externalVariantId', 'v1')
      .firstOrFail()
    await made.stores.mapListing(made.seller, listing.id, {
      sellerProductId: made.product.id,
      material: 'PLA',
      color: null,
      scalePercent: 100,
    })
    return made
  }

  const inbox = async (userId: string) =>
    (await Notification.query().where('userId', userId)).map((n) => n.title)

  test('the seller is told when an order needs a link, and when it is ready to pay', async ({
    assert,
  }) => {
    const { seller, stores, connection } = await shop()
    await stores.importOrder(connection, incoming('4001'))
    assert.isTrue((await inbox(seller.id)).some((t) => t.includes('needs a product link')))

    const made = await linkedShop()
    await made.stores.importOrder(made.connection, incoming('4002'))
    const titles = await inbox(made.seller.id)
    assert.isTrue(titles.some((t) => t.includes('#4002') && t.includes('ready to pay')))
  })

  test('cancelled in the shop before production: cancelled here, seller told', async ({
    client,
    assert,
  }) => {
    const { adapter, seller, stores, connection } = await linkedShop()
    await stores.importOrder(connection, incoming('4101'))
    const external = await ExternalOrder.findByOrFail('externalOrderId', '4101')

    const { body, headers } = adapter.signedCancellation(connection, '4101')
    const response = await client
      .post(`/webhooks/stores/${connection.id}/orders`)
      .headers(headers)
      .json(JSON.parse(body))
    response.assertBodyContains({ status: 'cancelled' })

    await external.refresh()
    assert.equal(external.status, 'cancelled')
    assert.isNotNull(external.shopCancelledAt)
    assert.equal((await Order.findOrFail(external.orderId!)).status, 'cancelled')
    assert.isTrue((await inbox(seller.id)).some((t) => t.includes('was cancelled in your shop')))

    // the same cancellation again changes nothing
    await stores.shopCancelled(connection, '4101')
    assert.lengthOf(
      (await inbox(seller.id)).filter((t) => t.includes('was cancelled in your shop')),
      1
    )
  })

  test('cancelled after printing started: it still ships and the seller is told why', async ({
    assert,
  }) => {
    const { seller, stores, connection } = await linkedShop()
    await stores.importOrder(connection, incoming('4201'))
    const external = await ExternalOrder.findByOrFail('externalOrderId', '4201')
    await Order.query().where('id', external.orderId!).update({ status: 'in_production' })

    await stores.shopCancelled(connection, '4201')
    assert.equal((await Order.findOrFail(external.orderId!)).status, 'in_production')
    assert.isTrue((await inbox(seller.id)).some((t) => t.includes('printing has started')))
  })

  test('cancelled before it was ever placed: it simply stops waiting', async ({ assert }) => {
    const { stores, connection } = await shop()
    await stores.importOrder(connection, incoming('4301'))
    await stores.shopCancelled(connection, '4301')
    const external = await ExternalOrder.findByOrFail('externalOrderId', '4301')
    assert.equal(external.status, 'cancelled')
    assert.isNull(external.orderId)
  })
})
