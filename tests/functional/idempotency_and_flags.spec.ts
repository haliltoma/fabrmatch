import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { randomUUID } from 'node:crypto'
import fabrmatchConfig from '#config/fabrmatch'
import Order from '#models/order'
import RoleService from '#services/identity/role_service'
import CartService from '#services/orders/cart_service'
import { featureEnabled } from '#services/settings/feature_flags'
import SettingsService from '#services/settings/settings_service'
import {
  TR_ADDRESS,
  createAnalyzedFile,
  createUser,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'

const inertia = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }

async function memberWithCart() {
  const user = await createUser('idem')
  await new RoleService().assignRole(user, 'seller')
  const file = await createAnalyzedFile(user)
  await new CartService().add(user, { modelFileId: file.id, material: 'PLA', quantity: 1 })
  return user
}

test.group('Idempotency-Key (X-3)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('a repeated checkout with the same key places one order and returns the same answer', async ({
    client,
    assert,
  }) => {
    const user = await memberWithCart()
    const key = randomUUID()
    const post = () =>
      client
        .post('/cart/checkout')
        .loginAs(user)
        .withCsrfToken()
        .headers({ ...inertia, 'idempotency-key': key })
        .redirects(0)
        .json({ shippingAddress: TR_ADDRESS })

    const first = await post()
    first.assertStatus(302)
    const second = await post()
    second.assertStatus(302)
    assert.equal(second.header('location'), first.header('location'))
    const orders = await Order.query().where('buyerId', user.id)
    assert.lengthOf(orders, 1)
  })

  test('a different key is a different attempt; malformed keys are refused', async ({
    client,
    assert,
  }) => {
    const user = await memberWithCart()
    const bad = await client
      .post('/cart/checkout')
      .loginAs(user)
      .withCsrfToken()
      .headers({ ...inertia, 'idempotency-key': 'short' })
      .redirects(0)
      .json({ shippingAddress: TR_ADDRESS })
    bad.assertStatus(400)

    const ok = await client
      .post('/cart/checkout')
      .loginAs(user)
      .withCsrfToken()
      .headers({ ...inertia, 'idempotency-key': randomUUID() })
      .redirects(0)
      .json({ shippingAddress: TR_ADDRESS })
    ok.assertStatus(302)
    const orders = await Order.query().where('buyerId', user.id)
    assert.lengthOf(orders, 1)
  })

  test('a failed attempt does not burn its key', async ({ client, assert }) => {
    const user = await createUser('idem2')
    await new RoleService().assignRole(user, 'seller')
    const key = randomUUID()
    const attempt = () =>
      client
        .post('/cart/checkout')
        .loginAs(user)
        .withCsrfToken()
        .headers({ ...inertia, 'idempotency-key': key })
        .redirects(0)
        .json({ shippingAddress: TR_ADDRESS })

    await attempt() // empty cart → domain error
    const file = await createAnalyzedFile(user)
    await new CartService().add(user, { modelFileId: file.id, material: 'PLA', quantity: 1 })
    const retry = await attempt()
    retry.assertStatus(302)
    assert.match(retry.header('location') ?? '', /^\/orders\/[0-9a-f-]{36}$/)
  })
})

test.group('feature flags (X-2)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.teardown(() => new SettingsService().syncFromDatabase())

  test('flags are off by default, switched by an admin, and reversible', async ({ assert }) => {
    const admin = await createUser('admin')
    const settings = new SettingsService()
    assert.isFalse(featureEnabled('rfq'))
    await settings.set('flags.rfq', 1, admin.id)
    assert.isTrue(featureEnabled('rfq'))
    await assert.rejects(() => settings.set('flags.rfq', 2, admin.id))
    await settings.reset('flags.rfq', admin.id)
    assert.isFalse(featureEnabled('rfq'))
    assert.equal(fabrmatchConfig.flags.rfq, 0)
  })
})
