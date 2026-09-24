import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Order from '#models/order'
import RoleService from '#services/identity/role_service'
import CartService from '#services/orders/cart_service'
import {
  TR_ADDRESS,
  createAnalyzedFile,
  createUser,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'

const inertia = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }

async function member(verified = true) {
  const user = await createUser('cart', { verified })
  await new RoleService().assignRole(user, 'seller')
  return user
}

test.group('cart over HTTP', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('guests are sent to login', async ({ client, assert }) => {
    const response = await client.get('/cart').redirects(0)
    response.assertStatus(302)
    assert.include(response.header('location'), '/login')
  })

  test('add, view and check out a two-line cart', async ({ client, assert }) => {
    const user = await member()
    const a = await createAnalyzedFile(user, 9000)
    const b = await createAnalyzedFile(user, 6000)

    for (const [file, material] of [
      [a, 'PLA'],
      [b, 'PETG'],
    ] as const) {
      const add = await client
        .post('/cart/items')
        .loginAs(user)
        .withCsrfToken()
        .headers(inertia)
        .redirects(0)
        .json({ modelFileId: file.id, material, quantity: 2 })
      add.assertStatus(302)
    }

    const page = await client.get('/cart').loginAs(user).headers(inertia)
    page.assertStatus(200)
    assert.lengthOf(page.body().props.lines, 2)
    assert.isAbove(page.body().props.totals.totalMinor, 0)
    assert.equal(page.body().props.cartCount, 4)

    const checkout = await client
      .post('/cart/checkout')
      .loginAs(user)
      .withCsrfToken()
      .headers(inertia)
      .redirects(0)
      .json({ shippingAddress: TR_ADDRESS })
    checkout.assertStatus(302)
    assert.match(checkout.header('location') ?? '', /^\/orders\/\d+$/)
    const orders = await Order.query().where('buyerId', user.id)
    assert.lengthOf(orders, 1)
    assert.equal(orders[0].totalMinor, page.body().props.totals.totalMinor)
    assert.equal(await new CartService().count(user.id), 0)
  })

  test('an unverified member can fill a cart but not check out', async ({ client, assert }) => {
    const user = await member(false)
    const file = await createAnalyzedFile(user)
    await new CartService().add(user, { modelFileId: file.id, material: 'PLA', quantity: 1 })
    const response = await client
      .post('/cart/checkout')
      .loginAs(user)
      .withCsrfToken()
      .header('accept', 'application/json')
      .json({ shippingAddress: TR_ADDRESS })
    response.assertStatus(403)
    assert.equal(response.body().code, 'email_unverified')
    assert.equal(await new CartService().count(user.id), 1)
  })
})
