import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import fabrmatchConfig from '#config/fabrmatch'
import Order from '#models/order'
import RoleService from '#services/identity/role_service'
import CartService from '#services/orders/cart_service'
import FxService from '#services/pricing/fx_service'
import { StaticFxProvider } from '#services/pricing/fx_provider'
import {
  TR_ADDRESS,
  createAnalyzedFile,
  createUser,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'

const inertia = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }
const flags = fabrmatchConfig.flags as Record<string, number>

async function cartOwner() {
  const user = await createUser('cart')
  await new RoleService().assignRole(user, 'seller')
  const file = await createAnalyzedFile(user, 9000)
  await new CartService().add(user, { modelFileId: file.id, material: 'PLA', quantity: 2 })
  return user
}

test.group('cart currency over HTTP', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())
  group.each.teardown(() => {
    flags.currencyUsd = 0
  })

  test('with only TRY on there is no choice, and a USD request shows a clear problem', async ({
    client,
    assert,
  }) => {
    const user = await cartOwner()
    const page = await client.get('/cart?currency=USD').headers(inertia).loginAs(user)
    page.assertStatus(200)
    assert.deepEqual(page.body().props.currencies, ['TRY'])
    assert.isNull(page.body().props.totals)
    assert.include(page.body().props.problem, 'USD')
  })

  test('once USD is on the buyer can see the cart and check out in it', async ({
    client,
    assert,
  }) => {
    flags.currencyUsd = 1
    await new FxService().refresh(new StaticFxProvider())
    const user = await cartOwner()

    const inTry = await client.get('/cart').headers(inertia).loginAs(user)
    const inUsd = await client.get('/cart?currency=USD').headers(inertia).loginAs(user)
    assert.deepEqual(inUsd.body().props.currencies, ['TRY', 'USD'])
    assert.equal(inTry.body().props.totals.currency, 'TRY')
    assert.equal(inUsd.body().props.totals.currency, 'USD')
    assert.isBelow(inUsd.body().props.totals.totalMinor, inTry.body().props.totals.totalMinor / 10)

    const checkout = await client
      .post('/cart/checkout')
      .loginAs(user)
      .withCsrfToken()
      .headers(inertia)
      .redirects(0)
      .json({ shippingAddress: TR_ADDRESS, currency: 'USD' })
    checkout.assertStatus(302)
    const order = await Order.query().where('buyerId', user.id).firstOrFail()
    assert.equal(order.currency, 'USD')
    assert.equal(order.totalMinor, inUsd.body().props.totals.totalMinor)
  })

  test('an unknown currency code is rejected before anything is priced', async ({
    client,
    assert,
  }) => {
    const user = await cartOwner()
    const response = await client
      .post('/cart/checkout')
      .loginAs(user)
      .withCsrfToken()
      .header('accept', 'application/json')
      .json({ shippingAddress: TR_ADDRESS, currency: 'JPY' })
    response.assertStatus(422)
    assert.lengthOf(await Order.all(), 0)
  })
})
