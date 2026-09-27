import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import fabrmatchConfig from '#config/fabrmatch'
import ExternalListing from '#models/external_listing'
import ExternalOrder from '#models/external_order'
import Order from '#models/order'
import ProductionJob from '#models/production_job'
import StoreConnection from '#models/store_connection'
import EncryptionService from '#services/identity/encryption_service'
import RoleService from '#services/identity/role_service'
import ShopifyAdapter from '#services/integrations/stores/shopify_adapter'
import WooCommerceAdapter from '#services/integrations/stores/woocommerce_adapter'
import { setStoreAdapter } from '#services/integrations/stores/store_registry'
import StoreService from '#services/integrations/stores/store_service'
import {
  createManufacturer,
  createPrinter,
  createStorefrontProduct,
} from '#tests/helpers/order_fixtures'
import { FakeShopify, FakeWoo } from '#tests/helpers/fake_shops'

const inertia = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }
const flags = fabrmatchConfig.flags as Record<string, number>

async function seller() {
  const made = await createStorefrontProduct()
  await new RoleService().assignRole(made.sellerUser, 'seller')
  return made
}

async function ship(orderId: number, tracking: string) {
  const { profile } = await createManufacturer()
  const printer = await createPrinter(profile)
  await ProductionJob.create({
    orderId,
    manufacturerProfileId: profile.id,
    printerId: printer.id,
    status: 'shipped',
    acceptedAt: DateTime.now(),
    dueAt: DateTime.now().plus({ days: 5 }),
    carrier: 'Yurtiçi',
    trackingNumber: tracking,
  })
}

test.group('Printify-style shops: connect → publish → paid order → tracking', (group) => {
  let shopify: FakeShopify
  let woo: FakeWoo
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => {
    flags.externalStores = 1
    shopify = new FakeShopify()
    woo = new FakeWoo()
    setStoreAdapter('shopify', new ShopifyAdapter(shopify.http))
    setStoreAdapter('woocommerce', new WooCommerceAdapter(woo.http))
    return () => {
      flags.externalStores = 0
      setStoreAdapter('shopify', null)
      setStoreAdapter('woocommerce', null)
    }
  })

  test('Shopify: credentials checked live, stored encrypted, paid-order webhook registered', async ({
    assert,
  }) => {
    const { sellerUser } = await seller()
    const stores = new StoreService()

    await assert.rejects(
      () =>
        stores.connect(sellerUser, {
          provider: 'shopify',
          shopUrl: 'https://evil.example.com',
          apiKey: shopify.clientId,
          apiSecret: shopify.clientSecret,
        }),
      /myshopify/
    )
    await assert.rejects(
      () =>
        stores.connect(sellerUser, {
          provider: 'shopify',
          shopUrl: 'test-shop',
          apiKey: shopify.clientId,
          apiSecret: 'wrong-secret-000',
        }),
      /did not give an access token/
    )
    assert.lengthOf(await StoreConnection.all(), 0)

    const { connection, warning } = await stores.connect(sellerUser, {
      provider: 'shopify',
      shopUrl: 'test-shop',
      apiKey: shopify.clientId,
      apiSecret: shopify.clientSecret,
    })
    assert.isNull(warning)
    assert.equal(connection.shopName, 'Test Shop')
    assert.equal(connection.shopUrl, 'test-shop.myshopify.com')
    assert.notInclude(JSON.stringify(connection.$attributes), shopify.clientSecret)
    assert.equal(new EncryptionService().decrypt(connection.apiSecretEnc!), shopify.clientSecret)
    assert.deepEqual(shopify.webhooks, [
      { topic: 'ORDERS_PAID', uri: stores.callbackUrl(connection) },
    ])
    // one token, reused while it is valid
    assert.lengthOf(shopify.tokens, 1)

    const other = await seller()
    await assert.rejects(
      () =>
        stores.connect(other.sellerUser, {
          provider: 'shopify',
          shopUrl: 'test-shop.myshopify.com',
          apiKey: shopify.clientId,
          apiSecret: shopify.clientSecret,
        }),
      /another Fabrmatch account/
    )
  })

  test('Shopify: publish → paid order arrives already linked → tracking goes back', async ({
    client,
    assert,
  }) => {
    const { sellerUser, product } = await seller()
    const stores = new StoreService()
    const { connection } = await stores.connect(sellerUser, {
      provider: 'shopify',
      shopUrl: 'test-shop',
      apiKey: shopify.clientId,
      apiSecret: shopify.clientSecret,
    })

    const published = await stores.publish(sellerUser, connection.id, product.id, [
      { material: 'PLA', priceMinor: 34_900 },
      { material: 'PETG', priceMinor: 39_900 },
    ])
    const inShop = shopify.products.get(published.productId)!
    assert.deepEqual(
      inShop.variants.map((v) => [v.sku, v.price]),
      [
        [`FM-${product.id}-PLA`, '349.00'],
        [`FM-${product.id}-PETG`, '399.00'],
      ]
    )
    const sent = shopify.requests.find((r) => r.query?.includes('productSet('))!
    assert.equal(sent.variables.input.variants[0].inventoryPolicy, 'CONTINUE')
    assert.equal(sent.variables.input.productOptions[0].name, 'Material')

    const listings = await ExternalListing.query()
      .where('storeConnectionId', connection.id)
      .where('published', true)
    assert.lengthOf(listings, 2)
    assert.isTrue(listings.every((l) => l.sellerProductId === product.id))

    // publishing again updates the same product in the shop
    await stores.publish(sellerUser, connection.id, product.id, [
      { material: 'PLA', priceMinor: 29_900 },
    ])
    assert.equal(shopify.products.size, 1)

    // the shop's paid order comes in through the webhook, no manual mapping
    const plaVariant = listings.find((l) => l.material === 'PLA')!
    const delivery = shopify.paidOrder({
      id: 5501,
      name: '#1001',
      lines: [{ variantId: plaVariant.externalVariantId, sku: plaVariant.sku!, quantity: 2 }],
    })
    const path = `/webhooks/stores/${connection.id}/orders`
    const received = await client
      .post(path)
      .headers(delivery.headers)
      .json(JSON.parse(delivery.body))
    received.assertBodyContains({ status: 'received' })
    const external = await ExternalOrder.findByOrFail('externalOrderId', '5501')
    assert.equal(external.status, 'placed')
    const order = await Order.findOrFail(external.orderId!)
    assert.equal(order.channel, 'shopify')
    assert.equal(order.buyerId, sellerUser.id)

    // other topics are acknowledged and ignored
    const other = await client
      .post(path)
      .headers({ ...delivery.headers, 'x-shopify-topic': 'orders/create' })
      .json(JSON.parse(delivery.body))
    other.assertBodyContains({ status: 'ignored' })

    shopify.fulfillmentOrders.set('5501', [
      { id: 'gid://shopify/FulfillmentOrder/77', status: 'OPEN' },
    ])
    await ship(order.id, 'YK5501')
    await stores.orderShipped(order.id)
    await stores.pushPendingFulfillments()
    assert.deepEqual(shopify.fulfillments, [
      { orderId: '5501', number: 'YK5501', company: 'Yurtiçi' },
    ])
    await external.refresh()
    assert.equal(external.fulfillmentStatus, 'pushed')
  })

  test('Shopify: an expired token is replaced before the call', async ({ assert }) => {
    const { sellerUser } = await seller()
    const stores = new StoreService()
    const { connection } = await stores.connect(sellerUser, {
      provider: 'shopify',
      shopUrl: 'test-shop',
      apiKey: shopify.clientId,
      apiSecret: shopify.clientSecret,
    })
    await connection.refresh()
    connection.tokenExpiresAt = DateTime.now().minus({ minutes: 1 })
    await connection.save()
    await stores.syncListings(sellerUser, connection.id)
    assert.lengthOf(shopify.tokens, 2)
  })

  test('WooCommerce: site URL + keys, both order webhooks, only paid orders, note + completed', async ({
    client,
    assert,
  }) => {
    const { sellerUser, product } = await seller()
    const stores = new StoreService()
    await assert.rejects(
      () =>
        stores.connect(sellerUser, {
          provider: 'woocommerce',
          shopUrl: 'http://127.0.0.1',
          apiKey: woo.key,
          apiSecret: woo.secret,
        }),
      /shop address/
    )
    const { connection } = await stores.connect(sellerUser, {
      provider: 'woocommerce',
      shopUrl: 'shop.example.com',
      apiKey: woo.key,
      apiSecret: woo.secret,
    })
    assert.equal(connection.currency, 'EUR')
    assert.deepEqual(
      woo.webhooks.map((w) => w.topic),
      ['order.created', 'order.updated']
    )
    const secret = woo.webhooks[0].secret
    assert.equal(new EncryptionService().decrypt(connection.webhookSecretEnc!), secret)

    const published = await stores.publish(sellerUser, connection.id, product.id, [
      { material: 'PLA', priceMinor: 1_990 },
    ])
    const variationId = Number(published.variants[0].variantId)
    assert.equal(
      woo.products.get(Number(published.productId))!.variations[0].regular_price,
      '19.90'
    )

    const path = `/webhooks/stores/${connection.id}/orders`
    const ping = await client.post(path).form({ webhook_id: '12' })
    ping.assertBodyContains({ status: 'ignored' })

    const pending = woo.orderWebhook(secret, {
      id: 801,
      status: 'pending',
      lines: [{ variationId, sku: `FM-${product.id}-PLA`, quantity: 1 }],
    })
    const unpaid = await client.post(path).headers(pending.headers).json(JSON.parse(pending.body))
    unpaid.assertBodyContains({ status: 'ignored' })
    const paid = woo.orderWebhook(secret, {
      id: 801,
      status: 'processing',
      lines: [{ variationId, sku: `FM-${product.id}-PLA`, quantity: 1 }],
    })
    const accepted = await client.post(path).headers(paid.headers).json(JSON.parse(paid.body))
    accepted.assertBodyContains({ status: 'received' })
    const external = await ExternalOrder.findByOrFail('externalOrderId', '801')
    const order = await Order.findOrFail(external.orderId!)
    assert.equal(order.channel, 'woocommerce')

    woo.orders.set(801, { status: 'processing', notes: [] })
    await ship(order.id, 'YK801')
    await stores.orderShipped(order.id)
    await stores.pushPendingFulfillments()
    assert.equal(woo.orders.get(801)!.status, 'completed')
    assert.include(woo.orders.get(801)!.notes[0], 'YK801')
  })

  test('connect and publish over HTTP; the page shows cost and suggested price', async ({
    client,
    assert,
  }) => {
    const { sellerUser, product } = await seller()
    const bad = await client
      .post('/seller/stores/connect')
      .withCsrfToken()
      .loginAs(sellerUser)
      .headers(inertia)
      .redirects(0)
      .json({
        provider: 'shopify',
        shopUrl: 'test-shop',
        apiKey: 'nope',
        apiSecret: 'wrong-secret-1',
      })
    bad.assertStatus(302)
    assert.lengthOf(await StoreConnection.all(), 0)

    await client
      .post('/seller/stores/connect')
      .withCsrfToken()
      .loginAs(sellerUser)
      .headers(inertia)
      .json({
        provider: 'shopify',
        shopUrl: 'test-shop',
        apiKey: shopify.clientId,
        apiSecret: shopify.clientSecret,
      })
    const connection = await StoreConnection.firstOrFail()

    const page = await client.get('/seller/stores').headers(inertia).loginAs(sellerUser)
    const props = page.body().props
    const row = props.products.find((p: any) => p.id === product.id)
    assert.isAbove(row.prices[0].suggestedMinor, row.prices[0].costMinor)
    assert.notInclude(JSON.stringify(props), shopify.clientSecret)

    await client
      .post(`/seller/stores/${connection.id}/publish`)
      .withCsrfToken()
      .loginAs(sellerUser)
      .headers(inertia)
      .json({ sellerProductId: product.id, variants: [{ material: 'PLA', priceMinor: 25_000 }] })
    assert.equal(shopify.products.size, 1)
  })
})
