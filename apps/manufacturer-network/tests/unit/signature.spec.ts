import { signPayload, signedWebhookHeaders } from '#services/contract/signature'
import { test } from '@japa/runner'

test.group('Contract signature', () => {
  test('matches the shared contract vector used by Sistem A', ({ assert }) => {
    // Aynı vektör apps/store/packages/api/src/lib/__tests__/fabrmatch-contract.unit.spec.ts içinde
    const body = JSON.stringify({ event_id: 'evt_vector', status: 'shipped', amount: 145.5 })

    assert.equal(
      signPayload('contract-vector-secret', '1790000000', body),
      'v1=8a47c13ff50768cb888cc73956f036a6a430e48ae0f5781d4d4bc3f4f1ac8512'
    )
  })

  test('signed headers carry the unix timestamp used in the signature', ({ assert }) => {
    const body = '{"a":1}'
    const headers = signedWebhookHeaders('secret', body, 1_790_000_000_500)

    assert.equal(headers['x-fabrmatch-timestamp'], '1790000000')
    assert.equal(headers['x-fabrmatch-signature'], signPayload('secret', '1790000000', body))
  })
})
