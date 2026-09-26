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

  test('unknown providers are refused', ({ assert }) => {
    assert.throws(
      () => assertPaymentConfigured({ ...base, provider: 'stripe' }),
      PaymentNotConfiguredError as never
    )
  })

  test('iyzico needs its keys, and in production the live endpoint and marketplace', ({
    assert,
  }) => {
    const iyzico = {
      baseUrl: 'https://api.iyzipay.com',
      apiKey: 'k',
      secretKey: 's',
      marketplace: true,
      platformSubMerchantKey: 'platform',
    }
    const run = (nodeEnv: PaymentRuntime['nodeEnv'], overrides: Partial<typeof iyzico>) => () =>
      assertPaymentConfigured({
        nodeEnv,
        provider: 'iyzico',
        webhookSecret: undefined,
        iyzico: { ...iyzico, ...overrides },
      })

    assert.doesNotThrow(run('production', {}))
    assert.throws(run('production', { secretKey: undefined as never }), /IYZICO_SECRET_KEY/)
    assert.throws(run('production', { marketplace: false }), /marketplace/)
    assert.throws(run('production', { baseUrl: 'https://sandbox-api.iyzipay.com' }), /sandbox/)
    assert.throws(run('development', { platformSubMerchantKey: undefined as never }), /PLATFORM/)
    // local sandbox without marketplace: pay + refund only
    assert.doesNotThrow(
      run('development', { baseUrl: 'https://sandbox-api.iyzipay.com', marketplace: false })
    )
  })
})
