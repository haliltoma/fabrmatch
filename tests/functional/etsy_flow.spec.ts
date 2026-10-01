import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import drive from '@adonisjs/drive/services/main'
import testUtils from '@adonisjs/core/services/test_utils'
import { Secret } from '@adonisjs/core/helpers'
import env from '#start/env'
import fabrmatchConfig from '#config/fabrmatch'
import ExternalOrder from '#models/external_order'
import Order from '#models/order'
import ProductImage from '#models/product_image'
import ProductionJob from '#models/production_job'
import StoreConnection from '#models/store_connection'
import RoleService from '#services/identity/role_service'
import EtsyAdapter from '#services/integrations/stores/etsy_adapter'
import EtsyOAuthService from '#services/integrations/stores/etsy_oauth_service'
import { setStoreAdapter } from '#services/integrations/stores/store_registry'
import StoreService from '#services/integrations/stores/store_service'
import {
  createManufacturer,
  createPrinter,
  createStorefrontProduct,
} from '#tests/helpers/order_fixtures'
import { FakeEtsy } from '#tests/helpers/fake_shops'

const flags = fabrmatchConfig.flags as Record<string, number>
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])

test.group('Etsy: connect with OAuth, publish, polled orders, tracking', (group) => {
  let etsy: FakeEtsy
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => {
    flags.externalStores = 1
    etsy = new FakeEtsy()
    env.set('ETSY_KEYSTRING', etsy.keystring)
    env.set('ETSY_SHARED_SECRET', new Secret(etsy.sharedSecret) as never)
    setStoreAdapter('etsy', new EtsyAdapter(etsy.http))
    drive.fake('s3')
    return () => {
      flags.externalStores = 0
      setStoreAdapter('etsy', null)
      drive.restore('s3')
    }
  })

  async function seller() {
    const made = await createStorefrontProduct()
    await new RoleService().assignRole(made.sellerUser, 'seller')
    return made
  }

  async function connect(user: Awaited<ReturnType<typeof seller>>['sellerUser']) {
    const oauth = new EtsyOAuthService(etsy.http, new EtsyAdapter(etsy.http))
    const { url, pkce } = oauth.start()
    const { code, state } = etsy.authorize(url)
    return oauth.finish(user, { code, state }, pkce)
  }

  test('PKCE: the right code verifier and state are required', async ({ assert }) => {
    const { sellerUser } = await seller()
    const oauth = new EtsyOAuthService(etsy.http, new EtsyAdapter(etsy.http))
    const { url, pkce } = oauth.start()
    const params = new URL(url).searchParams
    assert.equal(params.get('code_challenge_method'), 'S256')
    assert.include(params.get('scope')!, 'listings_w')
    assert.equal(params.get('client_id'), etsy.keystring)

    const { code, state } = etsy.authorize(url)
    await assert.rejects(() => oauth.finish(sellerUser, { code, state: 'forged' }, pkce), /expired/)
    await assert.rejects(
      () => oauth.finish(sellerUser, { code, state }, { ...pkce, verifier: 'wrong' }),
      /did not accept/
    )

    const connection = await connect(sellerUser)
    assert.equal(connection.shopName, 'PrintNest')
    assert.equal(connection.externalShopId, String(etsy.shopId))
    assert.equal(connection.currency, 'USD')
    assert.isNotNull(connection.refreshTokenEnc)
  })

  test('publish with category and images; paid receipts are polled; tracking goes back', async ({
    assert,
  }) => {
    const { sellerUser, product, catalog } = await seller()
    await drive.use('s3').put('renders/etsy-1.png', PNG, { contentType: 'image/png' })
    await ProductImage.create({
      modelFileId: catalog.modelFileId!,
      kind: 'render',
      status: 'approved',
      storageKey: 'renders/etsy-1.png',
      contentType: 'image/png',
      angle: 0,
    })
    const connection = await connect(sellerUser)
    const stores = new StoreService()

    await assert.rejects(
      () =>
        stores.publish(sellerUser, connection.id, product.id, [
          { material: 'PLA', priceMinor: 2_500 },
        ]),
      /Etsy category/
    )
    const published = await stores.publish(
      sellerUser,
      connection.id,
      product.id,
      [
        { material: 'PLA', priceMinor: 2_500 },
        { material: 'PETG', priceMinor: 2_990 },
      ],
      '1029'
    )
    const listing = etsy.listings.get(Number(published.productId))!
    assert.equal(listing.state, 'active')
    assert.equal(listing.taxonomyId, 1029)
    assert.equal(listing.images, 1)
    assert.deepEqual(
      listing.products.map((p) => [p.sku, p.price]),
      [
        [`FM-${product.id}-PLA`, 25],
        [`FM-${product.id}-PETG`, 29.9],
      ]
    )

    // a paid receipt appears in the shop; the poll picks it up and places the order
    const pla = published.variants.find((v) => v.material === 'PLA')!
    etsy.receipt(3_300_001, [{ productId: pla.variantId, sku: pla.sku, quantity: 2 }])
    const polled = await stores.pollOrders()
    assert.deepEqual(polled, { shops: 1, events: 1 })
    const external = await ExternalOrder.findByOrFail('externalOrderId', '3300001')
    assert.equal(external.status, 'placed')
    const order = await Order.findOrFail(external.orderId!)
    assert.equal(order.channel, 'etsy')
    // polling again (overlap window) does not duplicate it
    await stores.pollOrders()
    assert.lengthOf(await ExternalOrder.query().where('storeConnectionId', connection.id), 1)

    const { profile } = await createManufacturer()
    const printer = await createPrinter(profile)
    await ProductionJob.create({
      orderId: order.id,
      manufacturerProfileId: profile.id,
      printerId: printer.id,
      status: 'shipped',
      acceptedAt: DateTime.now(),
      dueAt: DateTime.now().plus({ days: 5 }),
      carrier: 'UPS',
      trackingNumber: '1Z999',
    })
    await stores.orderShipped(order.id)
    await stores.pushPendingFulfillments()
    assert.deepEqual(etsy.receipts.get(3_300_001).shipments, [
      { tracking_code: '1Z999', carrier_name: 'UPS' },
    ])
  })

  test('an expired access token is refreshed with the refresh token', async ({ assert }) => {
    const { sellerUser } = await seller()
    const connection = await connect(sellerUser)
    await StoreConnection.query()
      .where('id', connection.id)
      .update({ token_expires_at: DateTime.now().minus({ minutes: 5 }).toSQL() })
    const before = etsy.tokens.length
    await new StoreService().syncListings(sellerUser, connection.id)
    assert.equal(etsy.tokens.length, before + 1)
  })

  test('over HTTP: start redirects to Etsy, the callback connects, categories are searchable', async ({
    client,
    assert,
  }) => {
    const { sellerUser } = await seller()
    const start = await client.get('/seller/stores/etsy/start').loginAs(sellerUser).redirects(0)
    start.assertStatus(302)
    const location = start.header('location') ?? ''
    assert.match(location, /^https:\/\/www\.etsy\.com\/oauth\/connect\?/)

    // the verifier stayed in the seller's session, never in the URL
    assert.notInclude(location, start.session().etsy_pkce.verifier)
    const { code, state } = etsy.authorize(location)
    const back = await client
      .get(`/seller/stores/etsy/callback?code=${code}&state=${state}`)
      .loginAs(sellerUser)
      .withSession({ etsy_pkce: start.session().etsy_pkce })
      .redirects(0)
    back.assertStatus(302)
    assert.match(back.header('location') ?? '', /\/seller\/stores\?shop=[0-9a-f-]{36}/)

    const categories = await client
      .get('/seller/stores/etsy/categories?q=vase')
      .loginAs(sellerUser)
      .header('accept', 'application/json')
    categories.assertBodyContains({ results: [{ id: 1029 }] })
    assert.include(categories.body().results[0].path, 'Vases')
  })
})
