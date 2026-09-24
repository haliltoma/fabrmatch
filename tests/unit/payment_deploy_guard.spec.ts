import { test } from '@japa/runner'
import { assertPaymentConfigured, type PaymentRuntime } from '#services/payments/provider_registry'
import { PaymentNotConfiguredError } from '#services/payments/provider'

const base: PaymentRuntime = { nodeEnv: 'production', provider: 'fake', webhookSecret: 's3cret' }

test.group('assertPaymentConfigured (R0-T8 deploy guard)', () => {
  test('fake provider is refused in production and any non-dev/test env', ({ assert }) => {
    assert.throws(() => assertPaymentConfigured(base), /not allowed/)
    assert.throws(
      () => assertPaymentConfigured({ ...base, nodeEnv: 'production', webhookSecret: undefined }),
      /not allowed/
    )
  })

  test('fake provider is fine in development with a secret, and in test without one', ({
    assert,
  }) => {
    assert.doesNotThrow(() => assertPaymentConfigured({ ...base, nodeEnv: 'development' }))
    assert.doesNotThrow(() =>
      assertPaymentConfigured({ nodeEnv: 'test', provider: 'fake', webhookSecret: undefined })
    )
  })

  test('development without a webhook secret is refused', ({ assert }) => {
    assert.throws(
      () => assertPaymentConfigured({ ...base, nodeEnv: 'development', webhookSecret: undefined }),
      /PAYMENT_WEBHOOK_SECRET/
    )
  })

  test('real providers are refused until their adapter exists', ({ assert }) => {
    assert.throws(
      () => assertPaymentConfigured({ ...base, provider: 'iyzico' }),
      PaymentNotConfiguredError as never
    )
  })
})
