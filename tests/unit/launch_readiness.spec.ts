import { test } from '@japa/runner'
import { evaluateLaunch, type LaunchInputs } from '#services/admin/launch_readiness_service'

const ready: LaunchInputs = {
  salesModel: 'merchant_of_record',
  company: {
    legalName: 'Fabrmatch Teknoloji Ltd. Şti.',
    taxNumber: '1234567890',
    taxOffice: 'Kadıköy',
    address: 'Moda Cd. 1, Kadıköy, İstanbul',
  },
  payment: {
    nodeEnv: 'production',
    provider: 'iyzico',
    webhookSecret: undefined,
    salesModel: 'merchant_of_record',
    iyzico: {
      baseUrl: 'https://api.iyzipay.com',
      apiKey: 'k',
      secretKey: 's',
      marketplace: false,
      platformSubMerchantKey: undefined,
    },
  },
  invoiceProvider: 'edm',
  legalVersions: ['2026-10', '2026-10'],
  legalAcceptanceRequired: true,
  appUrl: 'https://fabrmatch.com',
  adminTwoFactor: true,
  previousAppKeySet: false,
  smtpHost: 'smtp.postmarkapp.com',
  s3Endpoint: 'https://abc.r2.cloudflarestorage.com',
  clamavHost: 'clamav.internal',
  fxProvider: 'tcmb',
  payableMakers: 5,
}

const failing = (input: LaunchInputs) =>
  evaluateLaunch(input)
    .filter((c) => !c.ok)
    .map((c) => c.id)

test.group('Launch readiness (R7-T8)', () => {
  test('a finished setup passes every check', ({ assert }) => {
    assert.deepEqual(failing(ready), [])
  })

  test('each missing piece is named', ({ assert }) => {
    assert.deepEqual(
      failing({ ...ready, company: { ...ready.company, taxNumber: '1111111111' } }),
      ['company_details']
    )
    assert.deepEqual(
      failing({
        ...ready,
        payment: {
          ...ready.payment,
          iyzico: { ...ready.payment.iyzico!, baseUrl: 'https://sandbox-api.iyzipay.com' },
        },
      }),
      ['payment_provider']
    )
    assert.deepEqual(failing({ ...ready, payment: { ...ready.payment, provider: 'fake' } }), [
      'payment_provider',
    ])
    assert.deepEqual(failing({ ...ready, invoiceProvider: 'fake' }), ['invoicing'])
    assert.deepEqual(failing({ ...ready, legalVersions: ['2026-09-draft'] }), ['legal_texts'])
    assert.deepEqual(failing({ ...ready, appUrl: 'http://localhost:3333' }), ['https'])
    assert.deepEqual(failing({ ...ready, smtpHost: 'localhost' }), ['email'])
    assert.deepEqual(failing({ ...ready, s3Endpoint: 'http://localhost:9000' }), ['storage'])
    assert.deepEqual(failing({ ...ready, payableMakers: 2 }), ['makers'])
    assert.deepEqual(failing({ ...ready, salesModel: 'marketplace' }), ['sales_model'])
  })

  test('the recommended ones do not block', ({ assert }) => {
    const checks = evaluateLaunch({
      ...ready,
      clamavHost: null,
      fxProvider: 'static',
      previousAppKeySet: true,
    })
    const open = checks.filter((c) => !c.ok)
    assert.sameMembers(
      open.map((c) => c.id),
      ['virus_scan', 'fx', 'key_rotation']
    )
    assert.isTrue(open.every((c) => !c.blocking))
  })
})
