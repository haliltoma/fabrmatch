import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import Payment from '#models/payment'
import RoleService from '#services/identity/role_service'
import { setPaymentProvider } from '#services/payments/provider_registry'
import LedgerService from '#services/payments/ledger_service'
import { createDraftOrder, createUser, orderStatus } from '#tests/helpers/order_fixtures'
import { makeIyzico, type FakeIyzico } from '#tests/helpers/fake_iyzico'

const inertia = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }

async function draft(phone: string | null = '+905551112233') {
  const buyer = await createUser('buyer')
  await new RoleService().assignRole(buyer, 'seller')
  const { order } = await createDraftOrder(buyer, {
    shippingAddress: {
      fullName: 'Ali Can Veli',
      line1: 'Test Sk. No:1',
      city: 'Istanbul',
      postalCode: '34000',
      country: 'TR',
      phone: phone ?? undefined,
    },
  })
  return { buyer, order }
}

test.group('iyzico checkout over HTTP', (group) => {
  let fake: FakeIyzico
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => {
    const made = makeIyzico()
    fake = made.fake
    setPaymentProvider(made.provider)
    return () => setPaymentProvider(null)
  })

  test('the order page asks for the identity number (and the phone only when missing)', async ({
    client,
  }) => {
    const { buyer, order } = await draft()
    const page = await client.get(`/orders/${order.id}`).loginAs(buyer).headers(inertia)
    page.assertBodyContains({ props: { payStep: { phoneOnFile: true, country: 'TR' } } })

    const other = await draft(null)
    const second = await client
      .get(`/orders/${other.order.id}`)
      .loginAs(other.buyer)
      .headers(inertia)
    second.assertBodyContains({ props: { payStep: { phoneOnFile: false } } })
  })

  test('pay refuses an invalid TCKN and sends nothing to iyzico', async ({ client, assert }) => {
    const { buyer, order } = await draft()
    const response = await client
      .post(`/orders/${order.id}/pay`)
      .json({ identityNumber: '12345678901' })
      .withCsrfToken()
      .loginAs(buyer)
      .headers(inertia)
      .redirects(0)
    response.assertStatus(302)
    assert.lengthOf(fake.requests, 0)
  })

  test('pay → iyzico form → return: order paid once, identity number never stored', async ({
    client,
    assert,
  }) => {
    const { buyer, order } = await draft()
    const response = await client
      .post(`/orders/${order.id}/pay`)
      .json({ identityNumber: '10000000146' })
      .withCsrfToken()
      .loginAs(buyer)
      .headers(inertia)
      .redirects(0)
    response.assertStatus(409)
    const location = response.header('x-inertia-location') ?? ''
    assert.match(location, /^https:\/\/sandbox-cpp\.iyzipay\.test\/\?token=tok_/)

    const sent = fake.requests[0].body as Record<string, any>
    assert.equal(sent.buyer.name, 'Ali Can')
    assert.equal(sent.buyer.surname, 'Veli')
    assert.equal(sent.buyer.gsmNumber, '+905551112233')
    assert.match(sent.callbackUrl, /\/payments\/return$/)

    const payment = await Payment.findByOrFail('orderId', order.id)
    assert.equal(payment.provider, 'iyzico')
    fake.complete(payment.providerRef)

    // iyzico's cross-site POST: no session, no CSRF token
    const back = await client
      .post('/payments/return')
      .form({ token: payment.providerRef })
      .redirects(0)
    back.assertStatus(302)
    assert.equal(back.header('location'), `/orders/${order.id}?payment=paid`)
    assert.notInclude(String(back.header('set-cookie') ?? ''), 'adonis-session')
    assert.notEqual(await orderStatus(order.id), 'awaiting_payment')
    assert.equal(
      await new LedgerService().balance('provider_cash', { orderId: order.id, currency: 'TRY' }),
      order.totalMinor
    )

    // the webhook for the same payment is recognised as a duplicate
    const { body, headers } = fake.webhook(payment.providerRef)
    const hook = await client.post('/webhooks/payments').headers(headers).json(JSON.parse(body))
    hook.assertStatus(200)
    hook.assertBodyContains({ status: 'duplicate' })

    const rows = await Promise.all([
      db.from('payments').where('order_id', order.id),
      db.from('orders').where('id', order.id),
      db.from('payment_webhooks').where('provider', 'iyzico'),
      db.from('audit_logs').where('subject_id', order.id),
    ])
    assert.notInclude(JSON.stringify(rows), '10000000146')
  })

  test('declined card: order stays payable, return says failed', async ({ client, assert }) => {
    const { buyer, order } = await draft()
    await client
      .post(`/orders/${order.id}/pay`)
      .json({ identityNumber: '10000000146' })
      .withCsrfToken()
      .loginAs(buyer)
      .headers(inertia)
      .redirects(0)
    const payment = await Payment.findByOrFail('orderId', order.id)
    fake.complete(payment.providerRef, { state: 'FAILURE' })

    const back = await client
      .post('/payments/return')
      .form({ token: payment.providerRef })
      .redirects(0)
    assert.equal(back.header('location'), `/orders/${order.id}?payment=failed`)
    assert.equal(await orderStatus(order.id), 'awaiting_payment')
    await payment.refresh()
    assert.equal(payment.status, 'failed')
  })

  test('a forged or unknown token changes nothing', async ({ client }) => {
    const back = await client.post('/payments/return').form({ token: 'tok_forged' }).redirects(0)
    back.assertStatus(302)
    back.assertHeader('location', '/orders?payment=error')
  })
})
