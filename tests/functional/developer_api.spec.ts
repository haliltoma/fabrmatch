/* eslint-disable @unicorn/no-await-expression-member -- terse status assertions read better inline */
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import ApiKey from '#models/api_key'
import User from '#models/user'
import WebhookDelivery from '#models/webhook_delivery'
import WebhookEndpoint from '#models/webhook_endpoint'
import OrderService from '#services/orders/order_service'
import OrderStateMachine from '#services/orders/order_state_machine'
import RoleService from '#services/identity/role_service'
import WebhookService from '#services/integrations/webhook_service'
import ApiKeyService, { MAX_ACTIVE_KEYS, hashKey } from '#services/integrations/api_key_service'
import { TR_ADDRESS, createStorefrontProduct, createUser } from '#tests/helpers/order_fixtures'

const INERTIA = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }

async function paidSale(shop: Awaited<ReturnType<typeof createStorefrontProduct>>) {
  const buyer = await createUser('buyer')
  const order = await new OrderService().createStorefrontDraft(buyer, shop.product.id, {
    material: 'PLA',
    quantity: 1,
    shippingAddress: TR_ADDRESS,
  })
  const sm = new OrderStateMachine()
  await sm.transition(order.id, 'awaiting_payment')
  await sm.transition(order.id, 'paid')
  return { order, buyer }
}

const bearer = (key: string) => ({ authorization: `Bearer ${key}` })

test.group('API keys', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('the key is shown once and only its hash is stored', async ({ assert }) => {
    const user = await createUser('seller')
    const { key, record } = await new ApiKeyService().create(user.id, ' Warehouse ')
    assert.match(key, /^fmk_[0-9a-f]{48}$/)
    assert.equal(record.name, 'Warehouse')
    assert.equal(record.keyHash, hashKey(key))
    assert.notInclude(JSON.stringify(record.serialize()), key)
    assert.isTrue(key.startsWith(record.prefix))
    assert.isBelow(record.prefix.length, key.length)
  })

  test('the number of active keys is capped; revoking frees a slot', async ({ assert }) => {
    const user = await createUser('seller')
    const service = new ApiKeyService()
    const keys = []
    for (let i = 0; i < MAX_ACTIVE_KEYS; i++) keys.push(await service.create(user.id, `k${i}`))
    await assert.rejects(() => service.create(user.id, 'one too many'))
    await service.revoke(user.id, keys[0].record.id)
    await service.create(user.id, 'fits now')
  })

  test('a seller cannot revoke someone else’s key', async ({ assert }) => {
    const owner = await createUser('seller')
    const other = await createUser('seller')
    const { record } = await new ApiKeyService().create(owner.id, 'mine')
    await assert.rejects(() => new ApiKeyService().revoke(other.id, record.id))
    assert.isNull((await ApiKey.findOrFail(record.id)).revokedAt)
  })
})

test.group('GET /api/v1', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('every request needs a valid key: missing, malformed, unknown and revoked are 401', async ({
    client,
    assert,
  }) => {
    const shop = await createStorefrontProduct()
    const { key, record } = await new ApiKeyService().create(shop.sellerUser.id, 'k')

    for (const headers of [
      {},
      { authorization: 'Bearer' },
      { authorization: 'Basic abc' },
      bearer('fmk_' + '0'.repeat(48)),
      bearer('not-a-key'),
    ]) {
      const response = await client.get('/api/v1/orders').headers(headers)
      response.assertStatus(401)
      assert.equal(response.body().error.code, 'invalid_api_key')
      assert.equal(response.header('www-authenticate'), 'Bearer')
    }

    ;(await client.get('/api/v1/orders').headers(bearer(key))).assertStatus(200)
    await new ApiKeyService().revoke(shop.sellerUser.id, record.id)
    ;(await client.get('/api/v1/orders').headers(bearer(key))).assertStatus(401)
  })

  test('a key stops working when its owner is suspended or is no longer a seller', async ({
    client,
  }) => {
    const shop = await createStorefrontProduct()
    const { key } = await new ApiKeyService().create(shop.sellerUser.id, 'k')
    ;(await client.get('/api/v1/products').headers(bearer(key))).assertStatus(200)

    await User.query()
      .where('id', shop.sellerUser.id)
      .update({ suspendedAt: DateTime.now().toSQL()! })
    ;(await client.get('/api/v1/products').headers(bearer(key))).assertStatus(401)

    const maker = await createUser('maker')
    await new RoleService().assignRole(maker, 'manufacturer')
    const { key: makerKey } = await new ApiKeyService().create(maker.id, 'k')
    ;(await client.get('/api/v1/orders').headers(bearer(makerKey))).assertStatus(401)
  })

  test('a seller lists only their own sales, without buyer or maker identity', async ({
    client,
    assert,
  }) => {
    const mine = await createStorefrontProduct()
    const other = await createStorefrontProduct({ title: 'Someone Else' })
    const own = await paidSale(mine)
    const foreign = await paidSale(other)
    const { key } = await new ApiKeyService().create(mine.sellerUser.id, 'k')

    const response = await client.get('/api/v1/orders').headers(bearer(key))
    response.assertStatus(200)
    const { data, meta } = response.body()
    assert.deepEqual(
      data.map((o: { code: string }) => o.code),
      [own.order.code]
    )
    assert.equal(meta.total, 1)
    assert.deepEqual(Object.keys(data[0]).sort(), [
      'code',
      'createdAt',
      'currency',
      'earnMinor',
      'id',
      'items',
      'status',
    ])
    const text = response.text().toLowerCase()
    for (const forbidden of [
      own.buyer.email,
      'ali veli',
      'manufacturer',
      foreign.order.code.toLowerCase(),
    ]) {
      assert.notInclude(text, forbidden.toLowerCase())
    }
  })

  test('one order by id: own is visible, another seller’s is a 404, drafts are hidden', async ({
    client,
    assert,
  }) => {
    const mine = await createStorefrontProduct()
    const other = await createStorefrontProduct({ title: 'Someone Else' })
    const own = await paidSale(mine)
    const foreign = await paidSale(other)
    const buyer = await createUser('buyer')
    const draft = await new OrderService().createStorefrontDraft(buyer, mine.product.id, {
      material: 'PLA',
      quantity: 1,
      shippingAddress: TR_ADDRESS,
    })
    const { key } = await new ApiKeyService().create(mine.sellerUser.id, 'k')

    const ok = await client.get(`/api/v1/orders/${own.order.id}`).headers(bearer(key))
    ok.assertStatus(200)
    assert.equal(ok.body().data.code, own.order.code)
    ;(await client.get(`/api/v1/orders/${foreign.order.id}`).headers(bearer(key))).assertStatus(404)
    ;(await client.get(`/api/v1/orders/${draft.id}`).headers(bearer(key))).assertStatus(404)
    ;(await client.get('/api/v1/orders/abc').headers(bearer(key))).assertStatus(404)
  })

  test('status filter and bad input are validated', async ({ client, assert }) => {
    const shop = await createStorefrontProduct()
    await paidSale(shop)
    const { key } = await new ApiKeyService().create(shop.sellerUser.id, 'k')

    const paid = await client.get('/api/v1/orders?status=paid').headers(bearer(key))
    assert.lengthOf(paid.body().data, 1)
    const shipped = await client.get('/api/v1/orders?status=shipped').headers(bearer(key))
    assert.lengthOf(shipped.body().data, 0)
    ;(await client.get('/api/v1/orders?status=bogus').headers(bearer(key))).assertStatus(422)
  })

  test('products lists the seller’s own products only', async ({ client, assert }) => {
    const mine = await createStorefrontProduct({ title: 'Mine' })
    await createStorefrontProduct({ title: 'Theirs' })
    const { key } = await new ApiKeyService().create(mine.sellerUser.id, 'k')

    const response = await client.get('/api/v1/products').headers(bearer(key))
    response.assertStatus(200)
    assert.deepEqual(
      response.body().data.map((p: { title: string }) => p.title),
      ['Mine']
    )
  })

  test('the API answers no cookies and ignores session logins', async ({ client }) => {
    const shop = await createStorefrontProduct()
    const response = await client.get('/api/v1/orders').loginAs(shop.sellerUser)
    response.assertStatus(401)
  })
})

test.group('/seller/developers', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('the page is for sellers and never lists the plain key or secret', async ({
    client,
    assert,
  }) => {
    const shop = await createStorefrontProduct()
    const { key } = await new ApiKeyService().create(shop.sellerUser.id, 'k')

    const page = await client.get('/seller/developers').headers(INERTIA).loginAs(shop.sellerUser)
    page.assertStatus(200)
    assert.lengthOf(page.body().props.keys, 1)
    assert.notInclude(page.text(), key)
    assert.isNull(page.body().props.newApiKey)

    const maker = await createUser('maker')
    await new RoleService().assignRole(maker, 'manufacturer')
    ;(await client.get('/seller/developers').loginAs(maker)).assertStatus(403)
  })

  test('creating a key over HTTP stores a hash and redirects back', async ({ client, assert }) => {
    const shop = await createStorefrontProduct()
    const response = await client
      .post('/seller/developers/keys')
      .loginAs(shop.sellerUser)
      .withCsrfToken()
      .headers(INERTIA)
      .redirects(0)
      .json({ name: 'CI' })
    response.assertStatus(302)
    assert.equal(response.header('location'), '/seller/developers')
    const row = await ApiKey.query().where('userId', shop.sellerUser.id).firstOrFail()
    assert.equal(row.name, 'CI')
    assert.lengthOf(row.keyHash, 64)
  })

  test('an unverified seller cannot create keys or webhooks', async ({ client, assert }) => {
    const shop = await createStorefrontProduct()
    await User.query().where('id', shop.sellerUser.id).update({ emailVerifiedAt: null })
    const key = await client
      .post('/seller/developers/keys')
      .loginAs(shop.sellerUser)
      .withCsrfToken()
      .header('accept', 'application/json')
      .json({ name: 'CI' })
    key.assertStatus(403)
    const hook = await client
      .post('/seller/developers/webhooks')
      .loginAs(shop.sellerUser)
      .withCsrfToken()
      .header('accept', 'application/json')
      .json({ url: 'https://hooks.example.com/x' })
    hook.assertStatus(403)
    assert.lengthOf(await ApiKey.all(), 0)
    assert.lengthOf(await WebhookEndpoint.all(), 0)
  })

  test('webhooks: add, refuse an internal URL, send a test event, turn off and delete', async ({
    client,
    assert,
  }) => {
    const shop = await createStorefrontProduct()
    const post = (path: string, body: object = {}) =>
      client
        .post(path)
        .loginAs(shop.sellerUser)
        .withCsrfToken()
        .headers(INERTIA)
        .redirects(0)
        .json(body)

    ;(await post('/seller/developers/webhooks', { url: 'https://169.254.169.254/x' })).assertStatus(
      302
    )
    assert.lengthOf(await WebhookEndpoint.all(), 0)

    ;(
      await post('/seller/developers/webhooks', { url: 'https://hooks.example.com/x' })
    ).assertStatus(302)
    const endpoint = await WebhookEndpoint.firstOrFail()
    assert.equal(endpoint.userId, shop.sellerUser.id)

    ;(await post(`/seller/developers/webhooks/${endpoint.id}/test`)).assertStatus(302)
    const queued = await WebhookDelivery.firstOrFail()
    assert.equal(queued.eventType, 'webhook.test')

    ;(
      await post(`/seller/developers/webhooks/${endpoint.id}/toggle`, { active: false })
    ).assertStatus(302)
    assert.isFalse((await WebhookEndpoint.findOrFail(endpoint.id)).isActive)

    const removed = await client
      .delete(`/seller/developers/webhooks/${endpoint.id}`)
      .loginAs(shop.sellerUser)
      .withCsrfToken()
      .headers(INERTIA)
      .redirects(0)
    removed.assertStatus(303)
    assert.lengthOf(await WebhookEndpoint.all(), 0)
  })

  test('another seller’s endpoint id changes nothing', async ({ client, assert }) => {
    const shop = await createStorefrontProduct()
    const intruder = await createStorefrontProduct({ title: 'Intruder shop' })
    const { endpoint } = await new WebhookService().createEndpoint(
      shop.sellerUser.id,
      'https://hooks.example.com/x'
    )
    const response = await client
      .delete(`/seller/developers/webhooks/${endpoint.id}`)
      .loginAs(intruder.sellerUser)
      .withCsrfToken()
      .headers(INERTIA)
      .redirects(0)
    response.assertStatus(303)
    assert.isNotNull(await WebhookEndpoint.find(endpoint.id))
  })
})
