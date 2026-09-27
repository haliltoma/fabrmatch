/* eslint-disable @unicorn/no-await-expression-member -- terse assertions read better inline */
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import env from '#start/env'
import fabrmatchConfig from '#config/fabrmatch'
import ExternalListing from '#models/external_listing'
import Notification from '#models/notification'
import Order from '#models/order'
import Payment from '#models/payment'
import RoleService from '#services/identity/role_service'
import OrderService from '#services/orders/order_service'
import FakePaymentProvider from '#services/payments/fake_provider'
import LedgerService from '#services/payments/ledger_service'
import PaymentService, { PaymentError } from '#services/payments/payment_service'
import ReconciliationService from '#services/payments/reconciliation_service'
import { setPaymentProvider } from '#services/payments/provider_registry'
import WalletService from '#services/payments/wallet_service'
import FakeStoreAdapter from '#services/integrations/stores/fake_store_adapter'
import { setStoreAdapter } from '#services/integrations/stores/store_registry'
import StoreService from '#services/integrations/stores/store_service'
import { createDraftOrder, createStorefrontProduct } from '#tests/helpers/order_fixtures'

const inertia = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }
const flags = fabrmatchConfig.flags as Record<string, number>
const ledger = new LedgerService()
const wallets = new WalletService()

test.group('Seller wallet (R4-T2)', (group) => {
  let provider: FakePaymentProvider
  let payments: PaymentService
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => {
    const before = env.get('SALES_MODEL')
    env.set('SALES_MODEL', 'merchant_of_record')
    flags.externalStores = 1
    provider = new FakePaymentProvider('wallet-secret')
    setPaymentProvider(provider)
    payments = new PaymentService(provider, async () => {})
    return () => {
      env.set('SALES_MODEL', before ?? 'marketplace')
      flags.externalStores = 0
      setPaymentProvider(null)
      setStoreAdapter('fake', null)
    }
  })

  async function seller() {
    const made = await createStorefrontProduct()
    await new RoleService().assignRole(made.sellerUser, 'seller')
    return made
  }

  /** Top-up through the real payment path: checkout, then the provider's signed webhook. */
  async function topUp(user: Awaited<ReturnType<typeof seller>>['sellerUser'], minor: number) {
    const { payment } = await payments.startTopUp(user, minor)
    const { body, headers } = provider.signedEvent({
      type: 'payment.succeeded',
      providerRef: payment.providerRef,
      amountMinor: minor,
    })
    await payments.handleWebhook(body, headers)
    return payment
  }

  test('a top-up becomes the seller’s balance through the provider webhook, once', async ({
    assert,
  }) => {
    const { sellerUser } = await seller()
    await assert.rejects(() => payments.startTopUp(sellerUser, 50), /Top up between/)

    const payment = await topUp(sellerUser, 50_000)
    assert.equal(await wallets.balance(sellerUser.id), 50_000)
    await payment.refresh()
    assert.equal(payment.status, 'succeeded')
    assert.isNull(payment.orderId)

    // the same webhook again does not double the money
    const { body, headers } = provider.signedEvent({
      eventId: 'evt-same',
      type: 'payment.succeeded',
      providerRef: payment.providerRef,
      amountMinor: 50_000,
    })
    await payments.handleWebhook(body, headers)
    await payments.handleWebhook(body, headers)
    assert.equal(await wallets.balance(sellerUser.id), 50_000)
    assert.equal(await ledger.trialBalance(), 0)
  })

  test('paying from the balance: only with enough money, then refunded back to it', async ({
    assert,
  }) => {
    const { sellerUser } = await seller()
    const { order } = await createDraftOrder(sellerUser, { quantity: 40 })
    await assert.rejects(
      () => payments.payFromWallet(order.id, sellerUser.id),
      PaymentError as never
    )

    await topUp(sellerUser, order.totalMinor + 1_000)
    await payments.payFromWallet(order.id, sellerUser.id)
    const paid = await Order.findOrFail(order.id)
    assert.equal(paid.status, 'paid')
    assert.equal(await wallets.balance(sellerUser.id), 1_000)
    assert.equal(await ledger.balance('buyer_escrow', { orderId: order.id }), order.totalMinor)
    const payment = await Payment.query().where('orderId', order.id).firstOrFail()
    assert.equal(payment.provider, 'wallet')

    // cancelled before a maker took it: the money goes back to the balance, not to a card
    await new OrderService(payments).cancelWithRefund(order.id, { actorId: null, by: 'system' })
    assert.equal(await wallets.balance(sellerUser.id), order.totalMinor + 1_000)
    assert.lengthOf(provider.refunds, 0)
    assert.equal(await ledger.trialBalance(), 0)
    assert.deepEqual(await new ReconciliationService().run(), [])

    const movements = await wallets.movements(sellerUser.id)
    assert.deepEqual(
      movements.map((m) => m.kind),
      ['refund', 'order', 'top_up']
    )
  })

  test('two orders cannot spend the same money', async ({ assert }) => {
    const { sellerUser } = await seller()
    const first = await createDraftOrder(sellerUser, { quantity: 40 })
    const second = await createDraftOrder(sellerUser, { quantity: 40 })
    await topUp(sellerUser, first.order.totalMinor + 10)
    const results = await Promise.allSettled([
      payments.payFromWallet(first.order.id, sellerUser.id),
      payments.payFromWallet(second.order.id, sellerUser.id),
    ])
    assert.lengthOf(
      results.filter((r) => r.status === 'fulfilled'),
      1
    )
    assert.isAtLeast(await wallets.balance(sellerUser.id), 0)
  })

  test('someone else’s order or a marketplace setup cannot use the balance', async ({ assert }) => {
    const { sellerUser } = await seller()
    const other = await seller()
    const { order } = await createDraftOrder(other.sellerUser, { quantity: 40 })
    await topUp(sellerUser, 500_000)
    await assert.rejects(() => payments.payFromWallet(order.id, sellerUser.id), /not found/)

    env.set('SALES_MODEL', 'marketplace')
    await assert.rejects(() => payments.startTopUp(sellerUser, 50_000), /only available/)
  })

  test('orders from the seller’s shop are paid from the balance as they arrive', async ({
    assert,
  }) => {
    const { sellerUser, product } = await seller()
    const adapter = new FakeStoreAdapter()
    setStoreAdapter('fake', adapter)
    const stores = new StoreService()
    const connection = await stores.connectTestShop(sellerUser)
    const listing = await ExternalListing.query()
      .where('storeConnectionId', connection.id)
      .where('externalVariantId', 'v1')
      .firstOrFail()
    await stores.mapListing(sellerUser, listing.id, {
      sellerProductId: product.id,
      material: 'PLA',
      color: null,
      scalePercent: 100,
    })
    const address = {
      fullName: 'Ayşe Demir',
      line1: 'Bağdat Cd. 200',
      city: 'Istanbul',
      postalCode: '34728',
      country: 'TR',
    }
    const line = [{ variantId: 'v1', sku: 'VASE-S', title: 'Vase', quantity: 1 }]

    // no balance: waits for payment
    const first = await stores.importOrder(connection, {
      externalOrderId: '7001',
      name: '#7001',
      lines: line,
      shippingAddress: address,
    })
    const unpaid = await Order.findOrFail(first.duplicate ? 0 : first.externalOrder!.orderId!)
    assert.equal(unpaid.status, 'draft')

    await topUp(sellerUser, 500_000)
    const second = await stores.importOrder(connection, {
      externalOrderId: '7002',
      name: '#7002',
      lines: line,
      shippingAddress: address,
    })
    const paid = await Order.findOrFail(second.duplicate ? 0 : second.externalOrder!.orderId!)
    // paid, and already handed to matching (no makers in this test: unmatched)
    assert.notInclude(['draft', 'awaiting_payment'], paid.status)
    assert.equal((await Payment.findByOrFail('orderId', paid.id)).provider, 'wallet')
    const titles = (await Notification.query().where('userId', sellerUser.id)).map((n) => n.title)
    assert.isTrue(titles.some((t) => t.includes('#7002') && t.includes('paid')))

    // auto-pay off: it waits again
    await wallets.setAutoPay(sellerUser.id, false)
    const third = await stores.importOrder(connection, {
      externalOrderId: '7003',
      name: '#7003',
      lines: line,
      shippingAddress: address,
    })
    assert.equal(
      (await Order.findOrFail(third.duplicate ? 0 : third.externalOrder!.orderId!)).status,
      'draft'
    )
  })

  test('over HTTP: wallet page, top-up via the test card page, pay an order from it', async ({
    client,
    assert,
  }) => {
    const { sellerUser } = await seller()
    const page = await client.get('/seller/wallet').headers(inertia).loginAs(sellerUser)
    page.assertBodyContains({
      component: 'seller/wallet',
      props: { balanceMinor: 0, available: true },
    })

    const started = await client
      .post('/seller/wallet/top-up')
      .withCsrfToken()
      .loginAs(sellerUser)
      .headers(inertia)
      .redirects(0)
      .json({ amountMinor: 200_000 })
    started.assertStatus(409)
    const checkout = started.header('x-inertia-location') ?? ''
    assert.match(checkout, /^\/dev\/checkout\//)

    const paid = await client
      .post(checkout)
      .withCsrfToken()
      .loginAs(sellerUser)
      .redirects(0)
      .json({ number: '4242 4242 4242 4242', expiry: '12/34', cvc: '123', name: 'Test' })
    assert.equal(paid.header('location'), '/seller/wallet')
    assert.equal(await wallets.balance(sellerUser.id), 200_000)

    const { order } = await createDraftOrder(sellerUser, { quantity: 40 })
    const orderPage = await client.get(`/orders/${order.id}`).headers(inertia).loginAs(sellerUser)
    orderPage.assertBodyContains({ props: { walletBalanceMinor: 200_000 } })
    await client
      .post(`/orders/${order.id}/pay-from-wallet`)
      .withCsrfToken()
      .loginAs(sellerUser)
      .headers(inertia)
    assert.notInclude(['draft', 'awaiting_payment'], (await Order.findOrFail(order.id)).status)
    assert.equal(await wallets.balance(sellerUser.id), 200_000 - order.totalMinor)
  })
})
