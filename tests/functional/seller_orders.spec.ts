import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import OrderService from '#services/orders/order_service'
import OrderStateMachine from '#services/orders/order_state_machine'
import RoleService from '#services/identity/role_service'
import { TR_ADDRESS, createStorefrontProduct, createUser } from '#tests/helpers/order_fixtures'

const INERTIA = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }

async function sale(shop: Awaited<ReturnType<typeof createStorefrontProduct>>) {
  const buyer = await createUser('buyer')
  const order = await new OrderService().createStorefrontDraft(buyer, shop.product.id, {
    material: 'PLA',
    quantity: 1,
    shippingAddress: TR_ADDRESS,
  })
  const sm = new OrderStateMachine()
  await sm.transition(order.id, 'awaiting_payment')
  await sm.transition(order.id, 'paid')
  return order
}

test.group('GET /seller/orders', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a seller sees only their own sales', async ({ client, assert }) => {
    const mine = await createStorefrontProduct()
    const other = await createStorefrontProduct({ title: 'Someone Else' })
    const own = await sale(mine)
    const foreign = await sale(other)

    const response = await client.get('/seller/orders').headers(INERTIA).loginAs(mine.sellerUser)
    response.assertStatus(200)
    const codes = response.body().props.orders.map((o: { code: string }) => o.code)
    assert.deepEqual(codes, [own.code])
    assert.notInclude(codes, foreign.code)
  })

  test('non-sellers are blocked and bad filters are rejected', async ({ client, assert }) => {
    const maker = await createUser('maker')
    await new RoleService().assignRole(maker, 'manufacturer')
    const blocked = await client.get('/seller/orders').loginAs(maker)
    blocked.assertStatus(403)

    const shop = await createStorefrontProduct()
    const bad = await client
      .get('/seller/orders?status=bogus')
      .headers(INERTIA)
      .loginAs(shop.sellerUser)
      .redirects(0)
    assert.notEqual(bad.status(), 500)
  })

  test('guests are redirected to login', async ({ client }) => {
    const response = await client.get('/seller/orders').redirects(0)
    response.assertStatus(302)
  })
})

test.group('seller insight endpoints', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('margin preview and analytics are seller-only', async ({ client, assert }) => {
    const { catalog, sellerUser } = await createStorefrontProduct()
    const inertia = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }

    const preview = await client
      .get(`/seller/margin-preview?catalogProductId=${catalog.id}&marginBps=2000`)
      .loginAs(sellerUser)
      .header('accept', 'application/json')
    preview.assertStatus(200)
    assert.isArray(preview.body().options)

    const page = await client.get('/seller/analytics').loginAs(sellerUser).headers(inertia)
    page.assertStatus(200)
    assert.equal(page.body().props.analytics.days, 30)

    const maker = await createUser('maker')
    await new RoleService().assignRole(maker, 'manufacturer')
    const denied = await client.get('/seller/analytics').loginAs(maker)
    denied.assertStatus(403)
  })
})
