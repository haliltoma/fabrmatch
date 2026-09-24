import { test } from '@japa/runner'
import EncryptionService from '#services/identity/encryption_service'

test.group('EncryptionService', () => {
  test('encrypts and decrypts a string', async ({ assert }) => {
    const service = new EncryptionService()
    const plaintext = 'TR33 0006 1005 1978 6457 8413 26'

    const ciphertext = service.encrypt(plaintext)
    assert.notEqual(ciphertext, plaintext)

    const decrypted = service.decrypt(ciphertext)
    assert.equal(decrypted, plaintext)
  })

  test('produces different ciphertexts for same plaintext', async ({ assert }) => {
    const service = new EncryptionService()
    const plaintext = '12345678901'

    const ct1 = service.encrypt(plaintext)
    const ct2 = service.encrypt(plaintext)

    assert.notEqual(ct1, ct2)
  })
})
