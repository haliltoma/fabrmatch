import { test } from '@japa/runner'
import {
  InvalidWebhookSignatureError,
  type PaymentProvider,
  type WebhookEventType,
} from '#services/payments/provider'

export interface ProviderHarness {
  provider: PaymentProvider
  /** Produces a delivery exactly as the real provider would sign and send it. */
  signedEvent(input: {
    eventId: string
    type: WebhookEventType
    providerRef: string
    amountMinor: number
  }): { body: string; headers: Record<string, string> }
}

/** Every PaymentProvider adapter (fake, iyzico, Stripe…) must pass this same suite. */
export function paymentProviderContract(label: string, make: () => ProviderHarness) {
  test.group(`PaymentProvider contract: ${label}`, () => {
    test('createCheckout returns a provider ref and a redirect url', async ({ assert }) => {
      const { provider } = make()
      const result = await provider.createCheckout({
        orderId: 1,
        orderCode: 'FO-CONTRACT1',
        amountMinor: 12_500,
        currency: 'TRY',
        buyerEmail: 'buyer@example.com',
        callbackUrl: 'https://example.com/callback',
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
      assert.equal(event.eventId, 'evt_contract_1')
      assert.equal(event.type, 'payment.succeeded')
      assert.equal(event.providerRef, 'ref_1')
      assert.strictEqual(event.amountMinor, 5_000)
    })

    test('handleWebhook rejects a tampered body and missing signature', async ({ assert }) => {
      const { provider, signedEvent } = make()
      const { body, headers } = signedEvent({
        eventId: 'evt_contract_2',
        type: 'payment.succeeded',
        providerRef: 'ref_2',
        amountMinor: 5_000,
      })
      const tampered = body.replace('5000', '1')
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

    test('approveItem is idempotent per key and distinct across keys', async ({ assert }) => {
      const { provider } = make()
      const base = {
        providerRef: 'ref_3',
        beneficiaryType: 'manufacturer' as const,
        beneficiaryId: 7,
        amountMinor: 9_000,
        currency: 'TRY',
      }
      const a = await provider.approveItem({ ...base, idempotencyKey: 'payout:1' })
      const again = await provider.approveItem({ ...base, idempotencyKey: 'payout:1' })
      const other = await provider.approveItem({ ...base, idempotencyKey: 'payout:2' })
      assert.equal(a.providerRef, again.providerRef)
      assert.notEqual(a.providerRef, other.providerRef)
    })

    test('refund is idempotent per key', async ({ assert }) => {
      const { provider } = make()
      const base = { providerRef: 'ref_4', amountMinor: 1_000, currency: 'TRY' }
      const a = await provider.refund({ ...base, idempotencyKey: 'refund:1' })
      const again = await provider.refund({ ...base, idempotencyKey: 'refund:1' })
      assert.equal(a.refundRef, again.refundRef)
    })

    test('registerSubMerchant is stable for the same beneficiary', async ({ assert }) => {
      const { provider } = make()
      const input = {
        beneficiaryType: 'seller' as const,
        beneficiaryId: 3,
        displayName: 'Shop',
      }
      const a = await provider.registerSubMerchant(input)
      const b = await provider.registerSubMerchant(input)
      assert.equal(a.subMerchantKey, b.subMerchantKey)
    })
  })
}
