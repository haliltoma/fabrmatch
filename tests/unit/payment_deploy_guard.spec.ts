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

  test('iyzico needs its keys; production needs the live endpoint', ({ assert }) => {
    const iyzico = {
      baseUrl: 'https://api.iyzipay.com',
      apiKey: 'k',
      secretKey: 's',
      marketplace: false,
      platformSubMerchantKey: undefined as string | undefined,
    }
    const run =
      (
        nodeEnv: PaymentRuntime['nodeEnv'],
        overrides: Partial<typeof iyzico>,
        salesModel: PaymentRuntime['salesModel'] = 'merchant_of_record'
      ) =>
      () =>
        assertPaymentConfigured({
          nodeEnv,
          provider: 'iyzico',
          webhookSecret: undefined,
          salesModel,
          iyzico: { ...iyzico, ...overrides },
        })

    // model B (Fabrmatch sells): a plain merchant account is what production needs
    assert.doesNotThrow(run('production', {}))
    assert.throws(run('production', { secretKey: undefined }), /IYZICO_SECRET_KEY/)
    assert.throws(run('production', { baseUrl: 'https://sandbox-api.iyzipay.com' }), /sandbox/)
    assert.throws(
      run('development', { marketplace: true, platformSubMerchantKey: 'p' }),
      /only for SALES_MODEL=marketplace/
    )
    assert.doesNotThrow(run('development', { baseUrl: 'https://sandbox-api.iyzipay.com' }))

    // model A (maker sells): money must stay with iyzico
    assert.throws(run('production', {}, 'marketplace'), /marketplace product/)
    assert.doesNotThrow(
      run('production', { marketplace: true, platformSubMerchantKey: 'p' }, 'marketplace')
    )
    assert.throws(run('development', { marketplace: true }, 'marketplace'), /PLATFORM/)
  })
})
