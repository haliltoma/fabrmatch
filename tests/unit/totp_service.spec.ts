import { test } from '@japa/runner'
import TotpService from '#services/identity/totp_service'

// RFC 6238 appendix B, SHA-1 secret "12345678901234567890" (base32 below), 6 digits = last 6 of the 8-digit vectors
const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'
const totp = new TotpService()

test.group('TotpService', () => {
  test('matches the RFC 6238 test vectors', ({ assert }) => {
    const vectors: Array<[number, string]> = [
      [59, '287082'],
      [1111111109, '081804'],
      [1111111111, '050471'],
      [1234567890, '005924'],
      [2000000000, '279037'],
    ]
    for (const [seconds, expected] of vectors) {
      assert.equal(totp.codeForStep(RFC_SECRET, totp.stepAt(seconds * 1000)), expected)
    }
  })

  test('verify accepts one step of drift, rejects two, and refuses replays', ({ assert }) => {
    const now = 1_700_000_000_000
    const step = totp.stepAt(now)
    const code = totp.codeForStep(RFC_SECRET, step)

    assert.equal(totp.verify(RFC_SECRET, code, { nowMs: now }), step)
    assert.equal(totp.verify(RFC_SECRET, code, { nowMs: now + 30_000 }), step)
    assert.isNull(totp.verify(RFC_SECRET, code, { nowMs: now + 90_000 }))
    assert.isNull(totp.verify(RFC_SECRET, code, { nowMs: now, lastStep: step }), 'replay')
    assert.isNull(totp.verify(RFC_SECRET, '000000', { nowMs: now }))
    assert.isNull(totp.verify(RFC_SECRET, 'abcdef', { nowMs: now }))
  })

  test('generated secrets are base32 and the provisioning URI carries them', ({ assert }) => {
    const secret = totp.generateSecret()
    assert.match(secret, /^[A-Z2-7]{32}$/)
    const uri = totp.otpauthUri('a@b.co', secret)
    assert.include(uri, `secret=${secret}`)
    assert.include(uri, 'issuer=Fabrmatch')
  })
})
