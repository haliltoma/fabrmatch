import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import fabrmatchConfig from '#config/fabrmatch'
import ExternalListing from '#models/external_listing'
import ExternalOrder from '#models/external_order'
import Notification from '#models/notification'
import Order from '#models/order'
import StoreConnection from '#models/store_connection'
import RoleService from '#services/identity/role_service'
import { setStoreAdapter } from '#services/integrations/stores/store_registry'
import StoreService from '#services/integrations/stores/store_service'
import WixAdapter from '#services/integrations/stores/wix_adapter'
import OrderService from '#services/orders/order_service'
import { createStorefrontProduct } from '#tests/helpers/order_fixtures'
import { FakeWix } from '#tests/helpers/fake_shops'

const flags = fabrmatchConfig.flags as Record<string, number>

async function seller() {
  const made = await createStorefrontProduct()
  await new RoleService().assignRole(made.sellerUser, 'seller')
  return made
}

test.group('Wix sites: install → connect → publish → paid order → cancel (V8)', (group) => {
  let wix: FakeWix
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => {
    flags.externalStores = 1
    wix = new FakeWix()
    wix.useEnv()
    setStoreAdapter('wix', new WixAdapter(wix.http))
    return () => {
      flags.externalStores = 0
      setStoreAdapter('wix', null)
      FakeWix.restoreEnv()
    }
  })

  test('opening our app from the Wix dashboard connects the site to the signed-in seller', async ({
    client,
    assert,
  }) => {
    const { sellerUser } = await seller()

    const start = await client.get('/seller/stores/wix/start').loginAs(sellerUser).redirects(0)
    assert.include(start.header('location'), `app-installer?appId=${wix.appId}`)

    // a forged or foreign instance connects nothing
    await client
      .get('/seller/stores/wix/connect')
      .qs({ instance: wix.signedInstance({}, 'not-our-secret') })
      .loginAs(sellerUser)
      .redirects(0)
    assert.lengthOf(await StoreConnection.query().where('provider', 'wix'), 0)
    // nor an old link copied from somewhere
    await client
      .get('/seller/stores/wix/connect')
      .qs({ instance: wix.signedInstance({ signDate: '2020-01-01T00:00:00.000Z' }) })
      .loginAs(sellerUser)
      .redirects(0)
    assert.lengthOf(await StoreConnection.query().where('provider', 'wix'), 0)

    const done = await client
      .get('/seller/stores/wix/connect')
      .qs({ instance: wix.signedInstance() })
      .loginAs(sellerUser)
      .redirects(0)
    const connection = await StoreConnection.query().where('provider', 'wix').firstOrFail()
    assert.include(done.header('location'), `/seller/stores?shop=${connection.id}`)
    assert.equal(connection.externalShopId, wix.instanceId)
    assert.equal(connection.shopName, 'Wix Test Site')
    assert.equal(connection.currency, 'EUR')
    assert.equal(connection.sellerUserId, sellerUser.id)

    // the same site cannot be taken over by another account
    const other = await seller()
    await client
      .get('/seller/stores/wix/connect')
      .qs({ signedInstance: wix.signedInstance() })
      .loginAs(other.sellerUser)
      .redirects(0)
    await connection.refresh()
    assert.equal(connection.sellerUserId, sellerUser.id)
  })

  test('publish → paid order through the shared webhook → our cancel asks for a refund in Wix', async ({
    client,
    assert,
  }) => {
    const { sellerUser, product } = await seller()
    const connection = await (async () => {
      await client
        .get('/seller/stores/wix/connect')
        .qs({ instance: wix.signedInstance() })
        .loginAs(sellerUser)
        .redirects(0)
      return StoreConnection.query().where('provider', 'wix').firstOrFail()
    })()
    const stores = new StoreService()
    const published = await stores.publish(sellerUser, connection.id, product.id, [
      { material: 'PLA', priceMinor: 2_900 },
    ])
    assert.equal(wix.products.get(published.productId)!.variants[0].price, '29.00')
    const listing = await ExternalListing.query()
      .where('storeConnectionId', connection.id)
      .where('material', 'PLA')
      .firstOrFail()

    const send = (jwt: string) =>
      client
        .post('/webhooks/wix')
        .form(jwt as never)
        .type('text/plain')
    const delivery = wix.paidOrder({
      id: 'wix-order-1',
      number: '10001',
      lines: [{ variantId: listing.externalVariantId, sku: listing.sku!, quantity: 1 }],
    })
    const received = await send(delivery)
    received.assertBodyContains({ status: 'received' })
    // Wix retries: the same event is stored once
    await send(delivery)
    const external = await ExternalOrder.findByOrFail('externalOrderId', 'wix-order-1')
    assert.lengthOf(await ExternalOrder.query().where('externalOrderId', 'wix-order-1'), 1)
    assert.equal(external.externalOrderName, '#10001')
    const order = await Order.findOrFail(external.orderId!)
    assert.equal(order.channel, 'wix')

    // a site we do not know is acknowledged and ignored; a bad signature is refused
    const unknown = await send(wix.webhook('wix.ecom.v1.order_approved', {}, 'unknown-site'))
    unknown.assertBodyContains({ status: 'ignored' })
    const tampered = await send(
      wix.tamper(delivery, (event) => {
        event.actionEvent.body.order.lineItems[0].quantity = 9
      })
    )
    tampered.assertUnauthorized()

    // nobody could print it: cancelled in Wix too, and the seller is asked to refund there
    await new OrderService().cancelWithRefund(order.id, { actorId: null, by: 'system' })
    await external.refresh()
    assert.equal(external.shopCancelStatus, 'done')
    assert.deepEqual(
      wix.cancelled.map((c) => c.orderId),
      ['wix-order-1']
    )
    const note = await Notification.query()
      .where('userId', sellerUser.id)
      .whereILike('title', '%refund%')
      .firstOrFail()
    assert.include(note.title, order.code)
  })

  test('removing our app in Wix disconnects the site', async ({ client, assert }) => {
    const { sellerUser } = await seller()
    await client
      .get('/seller/stores/wix/connect')
      .qs({ instance: wix.signedInstance() })
      .loginAs(sellerUser)
      .redirects(0)
    const removed = await client
      .post('/webhooks/wix')
      .form(wix.webhook('AppRemoved', {}) as never)
      .type('text/plain')
    removed.assertBodyContains({ status: 'ignored' })
    const connection = await StoreConnection.query().where('provider', 'wix').firstOrFail()
    assert.equal(connection.status, 'disconnected')
  })
})
