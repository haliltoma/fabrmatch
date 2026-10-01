import { test } from '@japa/runner'
import {
  InvalidWebhookSignatureError,
  type PaymentProvider,
  type WebhookEventType,
} from '#services/payments/provider'
import { uid } from '#tests/helpers/ids'

export interface ProviderHarness {
  provider: PaymentProvider
  /** Produces a delivery exactly as the real provider would sign and send it. */
  signedEvent(input: {
    eventId: string
    type: WebhookEventType
    providerRef: string
    amountMinor: number
  }): { body: string; headers: Record<string, string> }
  /** Changes a signed body so its signature no longer matches (default: the amount). */
  tamper?(body: string): string
  /** Makes `providerRef` a captured payment at the provider (for refund/approve). */
  paidCheckout?(providerRef: string, amountMinor: number): void | Promise<void>
}

const buyerDetails = {
  buyer: {
    id: '1',
    name: 'Ada',
    surname: 'Yılmaz',
    email: 'buyer@example.com',
    gsmNumber: '+905350000000',
    identityNumber: '10000000146',
    ip: '127.0.0.1',
  },
  shippingAddress: {
    contactName: 'Ada Yılmaz',
    address: 'Atatürk Cd. 1',
    city: 'İstanbul',
    country: 'TR',
    zipCode: '34000',
  },
}

/** Every PaymentProvider adapter (fake, iyzico, Stripe…) must pass this same suite. */
export function paymentProviderContract(label: string, make: () => ProviderHarness) {
  test.group(`PaymentProvider contract: ${label}`, () => {
    test('createCheckout returns a provider ref and a redirect url', async ({ assert }) => {
      const { provider } = make()
      const result = await provider.createCheckout({
        orderId: uid(1),
        orderCode: 'FO-CONTRACT1',
        amountMinor: 12_500,
        currency: 'TRY',
        buyerEmail: 'buyer@example.com',
        callbackUrl: 'https://example.com/callback',
        ...buyerDetails,
      })
      assert.isString(result.providerRef)
      assert.isNotEmpty(result.providerRef)
      assert.isString(result.redirectUrl)
    })

    test('handleWebhook parses a correctly signed event', async ({ assert }) => {
      const { provider, signedEvent } = make()
      const { body, headers } = signedEvent({
        eventId: 'evt_contract_1',
        type: 'payment.succeeded',
        providerRef: 'ref_1',
        amountMinor: 5_000,
      })
      const event = await provider.handleWebhook(body, headers)
      // providers may decorate their own id, but it must come from the delivery
      assert.include(event.eventId, 'evt_contract_1')
      assert.equal(event.type, 'payment.succeeded')
      assert.equal(event.providerRef, 'ref_1')
      assert.strictEqual(event.amountMinor, 5_000)
    })

    test('handleWebhook rejects a tampered body and missing signature', async ({ assert }) => {
      const { provider, signedEvent, tamper } = make()
      const { body, headers } = signedEvent({
        eventId: 'evt_contract_2',
        type: 'payment.succeeded',
        providerRef: 'ref_2',
        amountMinor: 5_000,
      })
      const tampered = tamper ? tamper(body) : body.replace('5000', '1')
      assert.notEqual(tampered, body)
      await assert.rejects(
        () => provider.handleWebhook(tampered, headers),
        'Invalid webhook signature'
      )
      await assert.rejects(() => provider.handleWebhook(body, {}), 'Invalid webhook signature')
      try {
        await provider.handleWebhook(body, {})
        assert.fail('expected rejection')
      } catch (error) {
        assert.instanceOf(error, InvalidWebhookSignatureError)
      }
    })

    test('approveItem is idempotent per key', async ({ assert }) => {
      const { provider, paidCheckout } = make()
      await paidCheckout?.('ref_3', 9_000)
      const base = {
        providerRef: 'ref_3',
        beneficiaryType: 'manufacturer' as const,
        beneficiaryId: uid(7),
        amountMinor: 9_000,
        currency: 'TRY',
      }
      const a = await provider.approveItem({ ...base, idempotencyKey: 'payout:1' })
      const again = await provider.approveItem({ ...base, idempotencyKey: 'payout:1' })
      assert.equal(a.providerRef, again.providerRef)
    })

    test('refund is idempotent per key', async ({ assert }) => {
      const { provider, paidCheckout } = make()
      await paidCheckout?.('ref_4', 1_000)
      const base = { providerRef: 'ref_4', amountMinor: 1_000, currency: 'TRY' }
      const a = await provider.refund({ ...base, idempotencyKey: 'refund:1' })
      const again = await provider.refund({ ...base, idempotencyKey: 'refund:1' })
      assert.equal(a.refundRef, again.refundRef)
    })

    test('registerSubMerchant is stable for the same beneficiary', async ({ assert }) => {
      const { provider } = make()
      const input = {
        beneficiaryType: 'seller' as const,
        beneficiaryId: uid(3),
        displayName: 'Shop',
      }
      const a = await provider.registerSubMerchant(input)
      const b = await provider.registerSubMerchant(input)
      assert.equal(a.subMerchantKey, b.subMerchantKey)
    })
  })
}
