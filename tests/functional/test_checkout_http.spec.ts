import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Order from '#models/order'
import Payment from '#models/payment'
import RoleService from '#services/identity/role_service'
import FakePaymentProvider from '#services/payments/fake_provider'
import { setPaymentProvider } from '#services/payments/provider_registry'
import PaymentService from '#services/payments/payment_service'
import { TEST_CARD } from '#services/payments/test_checkout_service'
import { createDraftOrder, createUser } from '#tests/helpers/order_fixtures'

const inertia = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }

async function draft() {
  const buyer = await createUser('buyer')
  await new RoleService().assignRole(buyer, 'seller')
  const { order } = await createDraftOrder(buyer)
  return { buyer, order }
}

test.group('local test payment page', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => {
    setPaymentProvider(new FakePaymentProvider('test-checkout-secret'))
    return () => setPaymentProvider(null)
  })

  test('Pay sends the buyer to the test payment page', async ({ client, assert }) => {
    const { buyer, order } = await draft()
    const response = await client
      .post(`/orders/${order.id}/pay`)
      .withCsrfToken()
      .loginAs(buyer)
      .headers(inertia)
      .redirects(0)
    response.assertStatus(409)
    const location = response.header('x-inertia-location') ?? ''
    assert.match(location, /^\/dev\/checkout\/fake_pay_[0-9a-f]+$/)

    const page = await client.get(location).loginAs(buyer).headers(inertia)
    page.assertStatus(200)
    page.assertBodyContains({
      component: 'dev/checkout',
      props: { orderCode: order.code, finished: false, testCard: { number: TEST_CARD.number } },
    })
  })

  test('the test card pays the order through the webhook path', async ({ client, assert }) => {
    const { buyer, order } = await draft()
    const { payment } = await new PaymentService(null, async () => {}).startCheckout(
      order.id,
      buyer.id
    )

    const response = await client
      .post(`/dev/checkout/${payment.providerRef}`)
      .withCsrfToken()
      .loginAs(buyer)
      .redirects(0)
      .form({ ...TEST_CARD, number: '4242 4242 4242 4242' })
    response.assertHeader('location', `/orders/${order.id}`)

    await payment.refresh()
    assert.equal(payment.status, 'succeeded')
    const paid = await Order.findOrFail(order.id)
    assert.notEqual(paid.status, 'awaiting_payment')
  })

  test('any other card is declined; the buyer can pay again with the test card', async ({
    client,
    assert,
  }) => {
    const { buyer, order } = await draft()
    const first = await new PaymentService(null, async () => {}).startCheckout(order.id, buyer.id)

    const declined = await client
      .post(`/dev/checkout/${first.payment.providerRef}`)
      .withCsrfToken()
      .loginAs(buyer)
      .redirects(0)
      .form({ ...TEST_CARD, number: '5555 5555 5555 4444' })
    declined.assertHeader('location', `/orders/${order.id}`)
    await first.payment.refresh()
    assert.equal(first.payment.status, 'failed')
    const unpaid = await Order.findOrFail(order.id)
    assert.equal(unpaid.status, 'awaiting_payment')

    const retry = await new PaymentService(null, async () => {}).startCheckout(order.id, buyer.id)
    await client
      .post(`/dev/checkout/${retry.payment.providerRef}`)
      .withCsrfToken()
      .loginAs(buyer)
      .redirects(0)
      .form(TEST_CARD)
    await retry.payment.refresh()
    assert.equal(retry.payment.status, 'succeeded')
  })

  test('an expired card is a form error and charges nothing', async ({ client, assert }) => {
    const { buyer, order } = await draft()
    const { payment } = await new PaymentService(null, async () => {}).startCheckout(
      order.id,
      buyer.id
    )
    await client
      .post(`/dev/checkout/${payment.providerRef}`)
      .withCsrfToken()
      .loginAs(buyer)
      .redirects(0)
      .form({ ...TEST_CARD, expiry: '01/20' })
    await payment.refresh()
    assert.equal(payment.status, 'pending')
  })

  test('another user cannot open or pay someone else’s checkout', async ({ client, assert }) => {
    const { buyer, order } = await draft()
    const { payment } = await new PaymentService(null, async () => {}).startCheckout(
      order.id,
      buyer.id
    )
    const stranger = await createUser('stranger')
    await new RoleService().assignRole(stranger, 'seller')

    await client
      .post(`/dev/checkout/${payment.providerRef}`)
      .withCsrfToken()
      .loginAs(stranger)
      .redirects(0)
      .form(TEST_CARD)
    const untouched = await Payment.findOrFail(payment.id)
    assert.equal(untouched.status, 'pending')
  })
})
