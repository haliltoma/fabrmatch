import { createHmac } from 'node:crypto'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { authorization, fromPrice, toPrice } from '#services/payments/iyzico/iyzico_client'
import DbProviderCallStore, {
  CallOutcomeUnknownError,
} from '#services/payments/iyzico/provider_call_store'
import { InvalidWebhookSignatureError } from '#services/payments/provider'
import { normalizePhone, validIdentityNumber } from '#services/payments/payment_service'
import { IYZICO_TEST_CREDENTIALS, makeIyzico } from '#tests/helpers/fake_iyzico'
import { uid } from '#tests/helpers/ids'

const checkoutInput = {
  orderId: uid(1),
  orderCode: 'FO-IYZ1',
  amountMinor: 12_345,
  currency: 'TRY',
  buyerEmail: 'buyer@example.com',
  callbackUrl: 'https://fabrmatch.test/payments/return',
  buyer: {
    id: '1',
    name: 'Ali',
    surname: 'Veli',
    email: 'buyer@example.com',
    gsmNumber: '+905551112233',
    identityNumber: '10000000146',
    ip: '127.0.0.1',
  },
  shippingAddress: {
    contactName: 'Ali Veli',
    address: 'Test Sk. No:1',
    city: 'Istanbul',
    country: 'TR',
    zipCode: '34000',
  },
  items: [
    { id: 'production' as const, name: '3D print', priceMinor: 10_345 },
    { id: 'seller' as const, name: 'Product', priceMinor: 2_000 },
  ],
}

test.group('iyzico client', () => {
  test('prices convert exactly between minor units and iyzico decimals', ({ assert }) => {
    assert.equal(toPrice(12_345), '123.45')
    assert.equal(toPrice(5), '0.05')
    assert.equal(toPrice(100), '1.00')
    assert.equal(fromPrice('123.45'), 12_345)
    assert.equal(fromPrice(123.4), 12_340)
    assert.equal(fromPrice('7'), 700)
    assert.equal(fromPrice(0.1 + 0.2), 30)
    assert.throws(() => toPrice(1.5))
  })

  test('IYZWSv2 header follows the documented recipe', ({ assert }) => {
    const body = '{"binNumber":"589004"}'
    const header = authorization(IYZICO_TEST_CREDENTIALS, 'rnd123', '/payment/bin/check', body)
    const signature = createHmac('sha256', IYZICO_TEST_CREDENTIALS.secretKey)
      .update('rnd123' + '/payment/bin/check' + body)
      .digest('hex')
    const decoded = Buffer.from(header.replace('IYZWSv2 ', ''), 'base64').toString('utf8')
    assert.equal(
      decoded,
      `apiKey:${IYZICO_TEST_CREDENTIALS.apiKey}&randomKey:rnd123&signature:${signature}`
    )
  })
})

test.group('iyzico adapter', () => {
  test('checkout form: buyer, single installment and a basket that adds up', async ({ assert }) => {
    const { provider, fake } = makeIyzico()
    const result = await provider.createCheckout(checkoutInput)
    assert.match(result.redirectUrl, /token=tok_/)

    const sent = fake.requests[0].body as Record<string, any>
    assert.equal(sent.price, '123.45')
    assert.equal(sent.paidPrice, '123.45')
    assert.deepEqual(sent.enabledInstallments, [1])
    assert.equal(sent.callbackUrl, checkoutInput.callbackUrl)
    assert.equal(sent.buyer.identityNumber, '10000000146')
    assert.equal(sent.buyer.country, 'Turkey')
    assert.deepEqual(
      sent.basketItems.map((item: Record<string, string>) => [item.id, item.price]),
      [
        ['production', '103.45'],
        ['seller', '20.00'],
      ]
    )
    assert.notProperty(sent.basketItems[0], 'subMerchantKey')
  })

  test('marketplace mode parks every item on the platform sub-merchant', async ({ assert }) => {
    const { provider, fake } = makeIyzico({ marketplace: true })
    await provider.createCheckout(checkoutInput)
    const items = (fake.requests[0].body as Record<string, any>).basketItems
    assert.equal(items[0].subMerchantKey, 'platform-sub')
    assert.equal(items[0].subMerchantPrice, '103.45')
  })

  test('refuses a checkout without buyer details or with a basket that does not add up', async ({
    assert,
  }) => {
    const { provider } = makeIyzico()
    await assert.rejects(() =>
      provider.createCheckout({ ...checkoutInput, buyer: undefined, shippingAddress: undefined })
    )
    await assert.rejects(
      () => provider.createCheckout({ ...checkoutInput, amountMinor: 99 }),
      /does not add up/
    )
  })

  test('return: the outcome is read back from iyzico, never taken from the browser', async ({
    assert,
  }) => {
    const { provider, fake } = makeIyzico()
    const { providerRef } = await provider.createCheckout(checkoutInput)

    // form not finished yet: iyzico says so, nothing is decided
    assert.isNull(await provider.confirmReturn({ token: providerRef }))

    fake.complete(providerRef, { fraudStatus: 0 })
    assert.isNull(await provider.confirmReturn({ token: providerRef, status: 'success' }))

    const payment = fake.complete(providerRef)
    const event = await provider.confirmReturn({ token: providerRef })
    assert.deepInclude(event, {
      eventId: `${payment.paymentId}:succeeded`,
      type: 'payment.succeeded',
      providerRef,
      amountMinor: 12_345,
      currency: 'TRY',
    })
    assert.notProperty(event!.raw, 'lastFourDigits')
    await assert.rejects(() => provider.confirmReturn({}), /Missing payment token/)
  })

  test('declined card and fraud rejection come back as payment.failed', async ({ assert }) => {
    const { provider, fake } = makeIyzico()
    const first = await provider.createCheckout(checkoutInput)
    fake.complete(first.providerRef, { state: 'FAILURE' })
    const declined = await provider.confirmReturn({ token: first.providerRef })
    assert.equal(declined?.type, 'payment.failed')

    const second = await provider.createCheckout(checkoutInput)
    fake.complete(second.providerRef, { fraudStatus: -1 })
    const rejected = await provider.confirmReturn({ token: second.providerRef })
    assert.equal(rejected?.type, 'payment.failed')
  })

  test('webhook and return produce the same event id (applied once)', async ({ assert }) => {
    const { provider, fake } = makeIyzico()
    const { providerRef } = await provider.createCheckout(checkoutInput)
    fake.complete(providerRef)
    const viaReturn = await provider.confirmReturn({ token: providerRef })
    const { body, headers } = fake.webhook(providerRef)
    const viaWebhook = await provider.handleWebhook(body, headers)
    assert.equal(viaWebhook.eventId, viaReturn!.eventId)
    assert.equal(viaWebhook.amountMinor, 12_345)
  })

  test('webhook: V3 signature required; non checkout-form events are only recorded', async ({
    assert,
  }) => {
    const { provider, fake } = makeIyzico()
    const { providerRef } = await provider.createCheckout(checkoutInput)
    fake.complete(providerRef)
    const { body } = fake.webhook(providerRef)
    await assert.rejects(
      () => provider.handleWebhook(body, {}),
      InvalidWebhookSignatureError as never
    )
    await assert.rejects(
      () => provider.handleWebhook('not json', {}),
      InvalidWebhookSignatureError as never
    )

    const direct = {
      paymentConversationId: 'c1',
      merchantId: '1',
      paymentId: '99',
      status: 'SUCCESS',
      iyziReferenceCode: 'r1',
      iyziEventType: 'REFUND',
      iyziEventTime: 1,
    }
    const secret = IYZICO_TEST_CREDENTIALS.secretKey
    const signature = createHmac('sha256', secret)
      .update(secret + 'REFUND' + '99' + 'c1' + 'SUCCESS')
      .digest('hex')
    const event = await provider.handleWebhook(JSON.stringify(direct), {
      'x-iyz-signature-v3': signature,
    })
    assert.equal(event.type, 'ignored')
  })

  test('refund reaches iyzico once per key', async ({ assert }) => {
    const { provider, fake, calls } = makeIyzico()
    const { providerRef } = await provider.createCheckout(checkoutInput)
    fake.complete(providerRef)
    const request = { providerRef, amountMinor: 2_345, currency: 'TRY', idempotencyKey: 'r:1' }
    const a = await provider.refund(request)
    const b = await provider.refund(request)
    assert.equal(a.refundRef, b.refundRef)
    assert.lengthOf(fake.refunds, 1)
    assert.equal(fake.refunds[0].priceMinor, 2_345)
    assert.equal(calls.results.size, 1)

    await provider.refund({ ...request, idempotencyKey: 'r:2', amountMinor: 10_000 })
    await assert.rejects(() =>
      provider.refund({ ...request, idempotencyKey: 'r:3', amountMinor: 1 })
    )
  })

  test('marketplace off: payouts are recorded, iyzico is not called', async ({ assert }) => {
    const { provider, fake } = makeIyzico()
    const result = await provider.approveItem({
      providerRef: 'tok_x',
      beneficiaryType: 'manufacturer',
      beneficiaryId: uid(1),
      amountMinor: 100,
      currency: 'TRY',
      idempotencyKey: 'payout:9',
    })
    assert.equal(result.providerRef, 'manual:payout:9')
    assert.lengthOf(fake.requests, 0)
    await assert.rejects(
      () =>
        provider.registerSubMerchant({
          beneficiaryType: 'manufacturer',
          beneficiaryId: uid(1),
          displayName: 'x',
        }),
      /marketplace is not enabled/
    )
  })

  test('marketplace: payout moves the item to the maker with their share, then approves once', async ({
    assert,
  }) => {
    const { provider, fake } = makeIyzico({ marketplace: true })
    const { providerRef } = await provider.createCheckout(checkoutInput)
    fake.complete(providerRef)
    const { subMerchantKey } = await provider.registerSubMerchant({
      beneficiaryType: 'manufacturer',
      beneficiaryId: uid(5),
      displayName: 'Maker',
    })

    const request = {
      providerRef,
      beneficiaryType: 'manufacturer' as const,
      beneficiaryId: uid(5),
      amountMinor: 8_000,
      currency: 'TRY',
      idempotencyKey: 'payout:1',
    }
    const first = await provider.approveItem(request)
    const item = fake.payments.get(providerRef)!.items.find((i) => i.itemId === 'production')!
    assert.equal(first.providerRef, item.paymentTransactionId)
    assert.equal(item.subMerchantKey, subMerchantKey)
    assert.equal(item.subMerchantPrice, 8_000)
    assert.equal(item.transactionStatus, 2)

    const approvals = () => fake.requests.filter((r) => r.path.endsWith('/item/approve')).length
    assert.equal(approvals(), 1)
    await provider.approveItem(request)
    assert.equal(approvals(), 1)

    await assert.rejects(
      () => provider.approveItem({ ...request, beneficiaryId: uid(404) }),
      /No iyzico sub-merchant/
    )
  })
})

test.group('iyzico call store (database)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a finished call is answered from the store; an unfinished one is never re-sent', async ({
    assert,
  }) => {
    const store = new DbProviderCallStore('iyzico-test')
    let calls = 0
    const call = async () => `ref_${++calls}`
    assert.equal(await store.once('k1', call), 'ref_1')
    assert.equal(await store.once('k1', call), 'ref_1')
    assert.equal(calls, 1)

    // a timeout: the money may have moved, so the key is kept and later attempts stop
    await assert.rejects(() =>
      store.once('k2', async () => {
        throw new Error('socket hang up')
      })
    )
    await assert.rejects(() => store.once('k2', call), CallOutcomeUnknownError as never)
    assert.equal(calls, 1)
  })
})

test.group('pay step input', () => {
  test('TCKN checksum for Turkish addresses, a plain id elsewhere', ({ assert }) => {
    assert.isTrue(validIdentityNumber('10000000146', 'TR'))
    assert.isFalse(validIdentityNumber('10000000147', 'TR'))
    assert.isFalse(validIdentityNumber('00000000146', 'TR'))
    assert.isFalse(validIdentityNumber('1000000014', 'TR'))
    assert.isTrue(validIdentityNumber('C01X00T47', 'DE'))
    assert.isFalse(validIdentityNumber('x', 'DE'))
  })

  test('phones are normalised to +country form', ({ assert }) => {
    assert.equal(normalizePhone('0555 111 22 33', 'TR'), '+905551112233')
    assert.equal(normalizePhone('555 111 22 33', 'TR'), '+905551112233')
    assert.equal(normalizePhone('+90 555 111 22 33', 'TR'), '+905551112233')
    assert.isNull(normalizePhone('0212 111 22 33', 'TR'))
    assert.equal(normalizePhone('+49 30 1234567', 'DE'), '+49301234567')
    assert.isNull(normalizePhone('', 'TR'))
  })
})
