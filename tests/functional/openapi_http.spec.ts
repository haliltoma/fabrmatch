import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import WebhookDelivery from '#models/webhook_delivery'
import OrderService from '#services/orders/order_service'
import OrderStateMachine from '#services/orders/order_state_machine'
import ApiKeyService from '#services/integrations/api_key_service'
import WebhookService from '#services/integrations/webhook_service'
import { ORDER_SCHEMA, PRODUCT_SCHEMA } from '#services/integrations/openapi'
import { TR_ADDRESS, createStorefrontProduct, createUser } from '#tests/helpers/order_fixtures'

/** Keys of an object, sorted, for comparing against a schema. */
const keysOf = (o: object) => Object.keys(o).sort()

test.group('OpenAPI document (R4-T12)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('is public and describes the API, its errors and webhooks', async ({ client, assert }) => {
    const response = await client.get('/api/v1/openapi.json')
    response.assertStatus(200)
    const doc = response.body()
    assert.equal(doc.openapi, '3.1.0')
    assert.sameMembers(Object.keys(doc.paths), ['/orders', '/orders/{id}', '/products'])
    assert.sameMembers(Object.keys(doc.webhooks), ['order.status_changed', 'webhook.test'])
    assert.match(doc.servers[0].url, /\/api\/v1$/)
    assert.equal(doc.components.securitySchemes.apiKey.scheme, 'bearer')
  })

  test('the documented order, product and webhook fields are exactly what the API sends', async ({
    client,
    assert,
  }) => {
    const shop = await createStorefrontProduct()
    const buyer = await createUser('buyer')
    await new WebhookService().createEndpoint(shop.sellerUser.id, 'https://hooks.example.com/fm')
    const order = await new OrderService().createStorefrontDraft(buyer, shop.product.id, {
      material: 'PLA',
      quantity: 1,
      shippingAddress: TR_ADDRESS,
    })
    const sm = new OrderStateMachine()
    await sm.transition(order.id, 'awaiting_payment')
    await sm.transition(order.id, 'paid')
    const { key } = await new ApiKeyService().create(shop.sellerUser.id, 'Docs check')
    const auth = { authorization: `Bearer ${key}` }

    const orders = await client.get('/api/v1/orders').headers(auth)
    orders.assertStatus(200)
    const sent = orders.body().data[0]
    assert.deepEqual(keysOf(sent), keysOf(ORDER_SCHEMA.properties))
    assert.deepEqual(keysOf(sent.items[0]), ['color', 'material', 'quantity'])
    assert.deepEqual(keysOf(orders.body().meta), ['page', 'pages', 'perPage', 'total'])

    const products = await client.get('/api/v1/products').headers(auth)
    assert.deepEqual(keysOf(products.body().data[0]), keysOf(PRODUCT_SCHEMA.properties))

    const docResponse = await client.get('/api/v1/openapi.json')
    const doc = docResponse.body()
    const delivery = await WebhookDelivery.query()
      .where('eventType', 'order.status_changed')
      .firstOrFail()
    const payload =
      typeof delivery.payload === 'string' ? JSON.parse(delivery.payload) : delivery.payload
    const schema =
      doc.webhooks['order.status_changed'].post.requestBody.content['application/json'].schema
    assert.deepEqual(keysOf(payload), keysOf(schema.properties))
    assert.deepEqual(
      keysOf(payload.data.order),
      keysOf(schema.properties.data.properties.order.properties)
    )
  })
})
