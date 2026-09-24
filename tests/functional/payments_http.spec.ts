import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import RoleService from '#services/identity/role_service'
import FakePaymentProvider from '#services/payments/fake_provider'
import { setPaymentProvider } from '#services/payments/provider_registry'
import DisputeService from '#services/disputes/dispute_service'
import PaymentService from '#services/payments/payment_service'
import LedgerService from '#services/payments/ledger_service'
import {
  createDraftOrder,
  createFundedOrder,
  createUser,
  disputeResponse,
  disputeStatus,
  orderStatus,
} from '#tests/helpers/order_fixtures'

const ledger = new LedgerService()

test.group('payment webhook endpoint', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => {
    const provider = new FakePaymentProvider('endpoint-secret')
    setPaymentProvider(provider)
    return () => setPaymentProvider(null)
  })

  async function checkout(provider: FakePaymentProvider) {
    const { order, buyer } = await createDraftOrder()
    const { payment } = await new PaymentService(provider, async () => {}).startCheckout(
      order.id,
      buyer.id
    )
    return { order, payment }
  }

  test('rejects a bad signature with 401 and changes nothing', async ({ client, assert }) => {
    const provider = new FakePaymentProvider('endpoint-secret')
    setPaymentProvider(provider)
    const { order, payment } = await checkout(provider)
    const { body } = provider.signedEvent({
      type: 'payment.succeeded',
      providerRef: payment.providerRef,
      amountMinor: payment.amountMinor,
    })

    const response = await client
      .post('/webhooks/payments')
      .header('x-fake-signature', 'nope')
      .json(JSON.parse(body))

    response.assertStatus(401)
    assert.equal(await orderStatus(order.id), 'awaiting_payment')
  })

  test('valid delivery is applied (no CSRF token needed); replay is acknowledged as duplicate', async ({
    client,
    assert,
  }) => {
    const provider = new FakePaymentProvider('endpoint-secret')
    setPaymentProvider(provider)
    const { order, payment } = await checkout(provider)
    const { body, headers } = provider.signedEvent({
      eventId: 'evt_http',
      type: 'payment.succeeded',
      providerRef: payment.providerRef,
      amountMinor: payment.amountMinor,
    })

    const send = () =>
      client
        .post('/webhooks/payments')
        .header('x-fake-signature', headers['x-fake-signature'])
        .json(JSON.parse(body))

    const first = await send()
    first.assertStatus(200)
    first.assertBodyContains({ status: 'processed' })
    assert.equal(await ledger.balance('buyer_escrow', { orderId: order.id }), order.totalMinor)
    assert.notEqual(await orderStatus(order.id), 'awaiting_payment')

    const second = await send()
    second.assertStatus(200)
    second.assertBodyContains({ status: 'duplicate' })
    assert.equal(await ledger.balance('buyer_escrow', { orderId: order.id }), order.totalMinor)
  })
})

test.group('dispute endpoints & admin gate', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => {
    setPaymentProvider(new FakePaymentProvider('endpoint-secret'))
    return () => setPaymentProvider(null)
  })

  test('buyer opens a dispute over HTTP; a stranger cannot', async ({ client, assert }) => {
    const provider = new FakePaymentProvider('endpoint-secret')
    setPaymentProvider(provider)
    const { order, buyer } = await createFundedOrder(provider, { upTo: 'delivered' })
    const stranger = await createUser('stranger')
    await new RoleService().assignRole(stranger, 'seller')
    await new RoleService().assignRole(buyer, 'seller')

    const denied = await client
      .post(`/orders/${order.id}/dispute`)
      .withCsrfToken()
      .loginAs(stranger)
      .redirects(0)
      .form({ reason: 'this is not even my order' })
    denied.assertStatus(302)
    assert.equal(await orderStatus(order.id), 'delivered')

    const ok = await client
      .post(`/orders/${order.id}/dispute`)
      .withCsrfToken()
      .loginAs(buyer)
      .redirects(0)
      .form({ reason: 'The part arrived cracked in two' })
    ok.assertStatus(302)
    assert.equal(await orderStatus(order.id), 'disputed')
  })

  test('only admins can list or resolve disputes', async ({ client, assert }) => {
    const provider = new FakePaymentProvider('endpoint-secret')
    setPaymentProvider(provider)
    const { order, buyer } = await createFundedOrder(provider, { upTo: 'delivered' })
    await new RoleService().assignRole(buyer, 'seller')
    const dispute = await new DisputeService().open(order.id, buyer.id, 'The part arrived cracked')

    const nonAdmin = await client.get('/admin/disputes').loginAs(buyer)
    nonAdmin.assertStatus(403)

    const attempt = await client
      .post(`/admin/disputes/${dispute.id}/resolve`)
      .withCsrfToken()
      .loginAs(buyer)
      .redirects(0)
      .form({ resolution: 'full_refund' })
    assert.notEqual(attempt.status(), 200)
    assert.equal(await disputeStatus(dispute.id), 'open')
    assert.equal(await orderStatus(order.id), 'disputed')
    assert.lengthOf(provider.refunds, 0)

    const admin = await createUser('admin')
    await new RoleService().assignRole(admin, 'admin')
    const list = await client.get('/admin/disputes').loginAs(admin)
    list.assertStatus(200)
    const detail = await client.get(`/admin/disputes/${dispute.id}`).loginAs(admin)
    detail.assertStatus(200)
  })

  test('manufacturer response route is manufacturer-only', async ({ client, assert }) => {
    const provider = new FakePaymentProvider('endpoint-secret')
    setPaymentProvider(provider)
    const { order, buyer } = await createFundedOrder(provider, { upTo: 'delivered' })
    await new RoleService().assignRole(buyer, 'seller')
    const dispute = await new DisputeService().open(order.id, buyer.id, 'The part arrived cracked')

    const attempt = await client
      .post(`/maker/disputes/${dispute.id}/respond`)
      .withCsrfToken()
      .loginAs(buyer)
      .redirects(0)
      .form({ response: 'my side of the story' })
    assert.notEqual(attempt.status(), 200)
    assert.isNull(await disputeResponse(dispute.id))
  })
})
