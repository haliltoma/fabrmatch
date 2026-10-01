import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import fabrmatchConfig from '#config/fabrmatch'
import Order from '#models/order'
import RoleService from '#services/identity/role_service'
import { TR_ADDRESS, createStorefrontProduct, createUser } from '#tests/helpers/order_fixtures'

async function orderCount(buyerId: string) {
  const row = await Order.query().where('buyerId', buyerId).count('* as n').first()
  return Number(row?.$extras.n ?? 0)
}

test.group('verified e-mail gate (R0-T2)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('unverified user cannot order from the shop; verified user can', async ({
    client,
    assert,
  }) => {
    const shop = await createStorefrontProduct()
    const payload = { material: 'PLA', quantity: 1, shippingAddress: TR_ADDRESS }

    const unverified = await createUser('buyer', { verified: false })
    await new RoleService().assignRole(unverified, 'seller')
    const blocked = await client
      .post(`/shop/${shop.product.id}/order`)
      .withCsrfToken()
      .loginAs(unverified)
      .redirects(0)
      .json(payload)
    blocked.assertStatus(302)
    assert.equal(await orderCount(unverified.id), 0)

    const verified = await createUser('buyer')
    await new RoleService().assignRole(verified, 'seller')
    const ok = await client
      .post(`/shop/${shop.product.id}/order`)
      .withCsrfToken()
      .loginAs(verified)
      .redirects(0)
      .json(payload)
    ok.assertStatus(302)
    assert.equal(await orderCount(verified.id), 1)
  })

  test('JSON clients get 403 with a machine-readable code', async ({ client }) => {
    const shop = await createStorefrontProduct()
    const user = await createUser('buyer', { verified: false })
    await new RoleService().assignRole(user, 'seller')
    const response = await client
      .post(`/shop/${shop.product.id}/order`)
      .withCsrfToken()
      .header('accept', 'application/json')
      .loginAs(user)
      .json({ material: 'PLA', quantity: 1, shippingAddress: TR_ADDRESS })
    response.assertStatus(403)
    response.assertBodyContains({ code: 'email_unverified' })
  })

  test('browsing and reading stay open to unverified users', async ({ client }) => {
    const user = await createUser('buyer', { verified: false })
    await new RoleService().assignRole(user, 'seller')
    const orders = await client.get('/orders').loginAs(user)
    orders.assertStatus(200)
    const shop = await client.get('/shop').loginAs(user)
    shop.assertStatus(200)
  })

  test('local dev switch: with verification off an unverified user can order', async ({
    client,
    assert,
  }) => {
    const shop = await createStorefrontProduct()
    const user = await createUser('buyer', { verified: false })
    await new RoleService().assignRole(user, 'seller')

    fabrmatchConfig.security.requireEmailVerification = false
    try {
      const response = await client
        .post(`/shop/${shop.product.id}/order`)
        .withCsrfToken()
        .loginAs(user)
        .redirects(0)
        .json({ material: 'PLA', quantity: 1, shippingAddress: TR_ADDRESS })
      response.assertStatus(302)
      assert.equal(await orderCount(user.id), 1)
    } finally {
      fabrmatchConfig.security.requireEmailVerification = true
    }
  })
})
