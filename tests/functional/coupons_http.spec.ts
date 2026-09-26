/* eslint-disable @unicorn/no-await-expression-member -- terse assertions read better inline */
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Coupon from '#models/coupon'
import Order from '#models/order'
import RoleService from '#services/identity/role_service'
import CartService from '#services/orders/cart_service'
import CouponService from '#services/pricing/coupon_service'
import {
  TR_ADDRESS,
  createAnalyzedFile,
  createStorefrontProduct,
  createUser,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'

const inertia = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }

async function cartOwner() {
  const user = await createUser('cart')
  await new RoleService().assignRole(user, 'seller')
  const file = await createAnalyzedFile(user, 9000)
  await new CartService().add(user, { modelFileId: file.id, material: 'PLA', quantity: 2 })
  return user
}

async function admin() {
  const user = await createUser('admin')
  await new RoleService().assignRole(user, 'admin')
  return user
}

test.group('coupons over HTTP', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('an admin creates a coupon in display units; a non-admin cannot', async ({
    client,
    assert,
  }) => {
    const boss = await admin()
    const response = await client
      .post('/admin/coupons')
      .loginAs(boss)
      .withCsrfToken()
      .headers(inertia)
      .redirects(0)
      .json({ code: 'summer-10', kind: 'percent', value: 12.5, minOrder: 200, maxRedemptions: 50 })
    response.assertStatus(302)
    const stored = await Coupon.findByOrFail('code', 'SUMMER-10')
    assert.equal(stored.value, 1250) // 12.5% in basis points
    assert.equal(stored.minOrderMinor, 20_000) // 200.00 TRY
    assert.equal(stored.maxRedemptions, 50)

    const fixed = await client
      .post('/admin/coupons')
      .loginAs(boss)
      .withCsrfToken()
      .headers(inertia)
      .redirects(0)
      .json({ code: 'FIFTY', kind: 'fixed', value: 50 })
    fixed.assertStatus(302)
    assert.equal((await Coupon.findByOrFail('code', 'FIFTY')).value, 5000)

    const page = await client.get('/admin/coupons').headers(inertia).loginAs(boss)
    page.assertStatus(200)
    assert.lengthOf(page.body().props.coupons, 2)

    const buyer = await createUser('buyer')
    await new RoleService().assignRole(buyer, 'seller')
    ;(
      await client
        .post('/admin/coupons')
        .loginAs(buyer)
        .withCsrfToken()
        .header('accept', 'application/json')
        .json({ code: 'HACK', kind: 'percent', value: 100 })
    ).assertStatus(403)
    assert.isNull(await Coupon.findBy('code', 'HACK'))
  })

  test('the cart shows the discount for a valid code and a plain reason for a bad one', async ({
    client,
    assert,
  }) => {
    await new CouponService().create({ code: 'TEN', kind: 'percent', value: 1000 })
    const user = await cartOwner()

    const plain = await client.get('/cart').headers(inertia).loginAs(user)
    const withCode = await client.get('/cart?coupon=ten').headers(inertia).loginAs(user)
    assert.equal(plain.body().props.totals.discountMinor, 0)
    const { totals } = withCode.body().props
    assert.isAbove(totals.discountMinor, 0)
    assert.equal(totals.totalMinor, plain.body().props.totals.totalMinor - totals.discountMinor)
    assert.isNull(withCode.body().props.couponProblem)

    const bad = await client.get('/cart?coupon=NOPE').headers(inertia).loginAs(user)
    assert.equal(bad.body().props.couponProblem, 'This code is not valid')
    assert.equal(bad.body().props.totals.discountMinor, 0) // the cart still prices normally
  })

  test('checkout with a code creates a discounted order and uses the code up', async ({
    client,
    assert,
  }) => {
    await new CouponService().create({ code: 'ONCE', kind: 'percent', value: 1000 })
    const user = await cartOwner()
    const checkout = await client
      .post('/cart/checkout')
      .loginAs(user)
      .withCsrfToken()
      .headers(inertia)
      .redirects(0)
      .json({ shippingAddress: TR_ADDRESS, couponCode: 'once' })
    checkout.assertStatus(302)
    const order = await Order.query().where('buyerId', user.id).firstOrFail()
    assert.isAbove(order.discountMinor, 0)

    // the same buyer cannot use it again
    const again = await client.get('/cart?coupon=ONCE').headers(inertia).loginAs(user)
    assert.equal(again.body().props.couponProblem, 'You have already used this code')
  })

  test('a bad code at checkout stops the order instead of silently charging full price', async ({
    client,
    assert,
  }) => {
    const user = await cartOwner()
    const response = await client
      .post('/cart/checkout')
      .loginAs(user)
      .withCsrfToken()
      .header('accept', 'application/json')
      .json({ shippingAddress: TR_ADDRESS, couponCode: 'NOPE' })
    response.assertStatus(422)
    assert.lengthOf(await Order.all(), 0)
  })

  test('a code on the shop order form discounts the storefront order', async ({
    client,
    assert,
  }) => {
    await new CouponService().create({ code: 'SHOP10', kind: 'percent', value: 1000 })
    const shop = await createStorefrontProduct()
    const buyer = await createUser('shopper')
    await new RoleService().assignRole(buyer, 'seller')
    const order = (couponCode?: string) =>
      client
        .post(`/shop/${shop.product.id}/order`)
        .loginAs(buyer)
        .withCsrfToken()
        .headers(inertia)
        .redirects(0)
        .json({ material: 'PLA', quantity: 1, shippingAddress: TR_ADDRESS, couponCode })

    const placed = await order('shop10')
    placed.assertStatus(302)
    const discounted = await Order.query().where('buyerId', buyer.id).firstOrFail()
    assert.isAbove(discounted.discountMinor, 0)

    const bad = await client
      .post(`/shop/${shop.product.id}/order`)
      .loginAs(buyer)
      .withCsrfToken()
      .header('accept', 'application/json')
      .json({ material: 'PLA', quantity: 1, shippingAddress: TR_ADDRESS, couponCode: 'NOPE' })
    bad.assertStatus(422)
    assert.lengthOf(await Order.query().where('buyerId', buyer.id), 1)
  })
})
