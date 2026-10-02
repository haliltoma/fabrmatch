import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import ExternalOrder from '#models/external_order'
import Order from '#models/order'
import ProductionJob from '#models/production_job'
import WebhookDelivery from '#models/webhook_delivery'
import ApiKeyService from '#services/integrations/api_key_service'
import WebhookService from '#services/integrations/webhook_service'
import RoleService from '#services/identity/role_service'
import OrderStateMachine from '#services/orders/order_state_machine'
import {
  TR_ADDRESS,
  createManufacturer,
  createPrinter,
  createStorefrontProduct,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'

async function sellerSite(scope: 'read' | 'read_write' = 'read_write') {
  const shop = await createStorefrontProduct({ materials: ['PLA', 'PETG'] })
  await new RoleService().assignRole(shop.sellerUser, 'seller')
  shop.catalog.allowedScales = [100, 150]
  await shop.catalog.save()
  const { key } = await new ApiKeyService().create(shop.sellerUser.id, 'My site', scope)
  await new WebhookService().createEndpoint(shop.sellerUser.id, 'https://hooks.example.com/fm')
  return { ...shop, auth: { authorization: `Bearer ${key}` } }
}

const orderBody = (productId: string, extra: Record<string, unknown> = {}) => ({
  externalId: 'web-1042',
  lines: [{ productId, material: 'pla', color: 'black', scalePercent: 150, quantity: 2 }],
  shippingAddress: TR_ADDRESS,
  ...extra,
})

const events = async (type: string) => {
  const rows = await WebhookDelivery.query().where('eventType', type)
  return rows.map((d) => (typeof d.payload === 'string' ? JSON.parse(d.payload) : d.payload))
}

test.group('W4: the seller’s own website orders through the API', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('a read-only key cannot quote, order or cancel', async ({ client }) => {
    const { product, auth } = await sellerSite('read')
    const order = await client.post('/api/v1/orders').headers(auth).json(orderBody(product.id))
    order.assertStatus(403)
    order.assertBodyContains({ error: { code: 'insufficient_scope' } })
    const quote = await client
      .post('/api/v1/quotes')
      .headers(auth)
      .json({ lines: orderBody(product.id).lines })
    quote.assertStatus(403)
    const read = await client.get('/api/v1/products').headers(auth)
    read.assertStatus(200)
  })

  test('reads products with variants, costs, colours and absolute picture addresses', async ({
    client,
    assert,
  }) => {
    const { product, auth } = await sellerSite()
    const options = await client.get('/api/v1/catalog/options').headers(auth)
    options.assertStatus(200)
    assert.includeMembers(
      options.body().data.materials.map((m: { code: string }) => m.code),
      ['PLA', 'PETG']
    )

    const one = await client.get(`/api/v1/products/${product.id}`).headers(auth)
    one.assertStatus(200)
    const data = one.body().data
    assert.sameDeepMembers(
      data.variants.map((v: { material: string; scalePercent: number }) => [
        v.material,
        v.scalePercent,
      ]),
      [
        ['PLA', 100],
        ['PLA', 150],
        ['PETG', 100],
        ['PETG', 150],
      ]
    )
    const pla = data.variants.find(
      (v: { material: string; scalePercent: number }) =>
        v.material === 'PLA' && v.scalePercent === 100
    )
    assert.isAbove(pla.costMinor, 0)
    assert.isAbove(pla.suggestedPriceMinor, pla.costMinor)
    assert.isAbove(data.colours.length, 0)
    assert.notProperty(data, 'modelFileId')

    const stranger = await sellerSite()
    const theirs = await client.get(`/api/v1/products/${stranger.product.id}`).headers(auth)
    theirs.assertStatus(404)
  })

  test('quotes lines, then places the order once per externalId', async ({ client, assert }) => {
    const { product, sellerUser, auth } = await sellerSite()
    const quote = await client
      .post('/api/v1/quotes')
      .headers(auth)
      .json({ lines: orderBody(product.id).lines })
    quote.assertStatus(200)
    const q = quote.body().data
    assert.equal(q.lines[0].material, 'PLA')
    assert.equal(q.lines[0].color, 'Black')
    assert.equal(q.totalMinor, q.lines[0].unitCostMinor * 2)

    const placed = await client.post('/api/v1/orders').headers(auth).json(orderBody(product.id))
    placed.assertStatus(201)
    const order = placed.body().data
    assert.equal(order.externalId, 'web-1042')
    assert.equal(order.channel, 'api')
    assert.isFalse(order.paid)
    assert.deepEqual(order.items, [
      { material: 'PLA', color: 'Black', scalePercent: 150, quantity: 2 },
    ])
    // rule 1: nothing about the buyer or a maker in what the site gets back
    const text = JSON.stringify(placed.body())
    assert.notInclude(text, TR_ADDRESS.fullName)
    assert.notInclude(text, sellerUser.email)

    const again = await client.post('/api/v1/orders').headers(auth).json(orderBody(product.id))
    again.assertStatus(200)
    assert.equal(again.body().data.id, order.id)
    assert.lengthOf(await Order.query().where('channel', 'api'), 1)

    const own = await client.get('/api/v1/orders?source=own').headers(auth)
    assert.deepEqual(
      own.body().data.map((o: { id: string }) => o.id),
      [order.id]
    )
    const created = await events('order.created')
    assert.lengthOf(created, 1)
    assert.equal(created[0].data.order.externalId, 'web-1042')

    // the address is stored encrypted, like a shop order's
    const external = await ExternalOrder.findByOrFail('externalOrderId', 'web-1042')
    assert.notInclude(external.shippingAddressEnc, TR_ADDRESS.line1)
  })

  test('refuses another seller’s product, a material or size not offered, and a bad address', async ({
    client,
    assert,
  }) => {
    const { product, auth } = await sellerSite()
    const stranger = await sellerSite()
    const post = (body: Record<string, unknown>) =>
      client.post('/api/v1/orders').headers(auth).json(body)

    const notMine = await post(orderBody(stranger.product.id))
    notMine.assertStatus(404)
    const material = await post(
      orderBody(product.id, {
        lines: [{ productId: product.id, material: 'TPU', quantity: 1 }],
      })
    )
    material.assertStatus(422)
    assert.equal(material.body().error.field, 'lines.0.material')
    const size = await post(
      orderBody(product.id, {
        lines: [{ productId: product.id, material: 'PLA', scalePercent: 200, quantity: 1 }],
      })
    )
    size.assertStatus(422)
    assert.equal(size.body().error.field, 'lines.0.scalePercent')
    const address = await post(orderBody(product.id, { shippingAddress: { fullName: 'A' } }))
    address.assertStatus(422)
    // nothing was left behind: the same id can be sent again once fixed
    assert.lengthOf(await ExternalOrder.all(), 0)
    const fixed = await post(orderBody(product.id))
    fixed.assertStatus(201)
  })

  test('cancels before production; the tracking reaches the site once shipped', async ({
    client,
    assert,
  }) => {
    const { product, auth } = await sellerSite()
    const first = await client.post('/api/v1/orders').headers(auth).json(orderBody(product.id))
    const cancel = await client.post(`/api/v1/orders/${first.body().data.id}/cancel`).headers(auth)
    cancel.assertStatus(200)
    assert.equal(cancel.body().data.status, 'cancelled')
    assert.lengthOf(await events('order.cancelled'), 1)

    const second = await client
      .post('/api/v1/orders')
      .headers(auth)
      .json(orderBody(product.id, { externalId: 'web-1043' }))
    const id = second.body().data.id
    const sm = new OrderStateMachine()
    for (const to of ['awaiting_payment', 'paid', 'matching', 'in_production'] as const) {
      await sm.transition(id, to)
    }
    const { profile } = await createManufacturer()
    const printer = await createPrinter(profile)
    await ProductionJob.create({
      orderId: id,
      manufacturerProfileId: profile.id,
      printerId: printer.id,
      status: 'shipped',
      acceptedAt: DateTime.now(),
      dueAt: DateTime.now().plus({ days: 5 }),
      carrier: 'Yurtiçi',
      trackingNumber: 'YK123456789',
    })
    await sm.transition(id, 'shipped')

    const shipped = await events('order.shipped')
    assert.lengthOf(shipped, 1)
    assert.deepEqual(shipped[0].data.order.tracking, { carrier: 'Yurtiçi', number: 'YK123456789' })
    const read = await client.get(`/api/v1/orders/${id}`).headers(auth)
    assert.deepEqual(read.body().data.tracking, { carrier: 'Yurtiçi', number: 'YK123456789' })
    assert.notInclude(JSON.stringify(read.body()), profile.id)

    const late = await client.post(`/api/v1/orders/${id}/cancel`).headers(auth)
    late.assertStatus(409)
  })
})
