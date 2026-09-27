import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'
import env from '#start/env'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 16
const TAG_LENGTH = 16

/**
 * Every column that holds EncryptionService output. The key rotation command walks exactly these;
 * a spec checks that no `*_enc` column in the database is missing from the list.
 */
export const ENCRYPTED_COLUMNS: Array<{ table: string; column: string }> = [
  { table: 'external_orders', column: 'shipping_address_enc' },
  { table: 'manufacturer_profiles', column: 'iban_enc' },
  { table: 'manufacturer_profiles', column: 'tax_id_enc' },
  { table: 'order_messages', column: 'original_enc' },
  { table: 'orders', column: 'shipping_address_enc' },
  { table: 'payee_tax_profiles', column: 'address_enc' },
  { table: 'payee_tax_profiles', column: 'iban_enc' },
  { table: 'payee_tax_profiles', column: 'tax_number_enc' },
  { table: 'seller_profiles', column: 'tax_id_enc' },
  { table: 'store_connections', column: 'access_token_enc' },
  { table: 'store_connections', column: 'api_key_enc' },
  { table: 'store_connections', column: 'api_secret_enc' },
  { table: 'store_connections', column: 'refresh_token_enc' },
  { table: 'store_connections', column: 'webhook_secret_enc' },
  { table: 'users', column: 'two_factor_secret_enc' },
  { table: 'webhook_endpoints', column: 'secret_enc' },
]

const deriveKey = (appKey: string) => scryptSync(appKey, 'fabrmatch-enc', KEY_LENGTH)

/**
 * AES-256-GCM for sensitive fields (address, IBAN, tax id, secrets), keyed from APP_KEY.
 * During a key rotation `APP_KEY_PREVIOUS` holds the old key: values not yet re-encrypted still
 * decrypt, so the app keeps working while `node ace security:rotate-key` runs.
 */
export default class EncryptionService {
  private key: Buffer
  private previousKey: Buffer | null

  constructor(appKey?: string, previousAppKey?: string | null) {
    this.key = deriveKey(appKey ?? env.get('APP_KEY').release())
    const previous =
      previousAppKey === undefined ? env.get('APP_KEY_PREVIOUS')?.release() : previousAppKey
    this.previousKey = previous ? deriveKey(previous) : null
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH)
    const cipher = createCipheriv(ALGORITHM, this.key, iv)
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return Buffer.concat([iv, tag, encrypted]).toString('base64')
  }

  decrypt(ciphertext: string): string {
    try {
      return this.decryptWith(this.key, ciphertext)
    } catch (error) {
      if (!this.previousKey) throw error
      return this.decryptWith(this.previousKey, ciphertext)
    }
  }

  /** True when the value was written with the current key (nothing to rotate). */
  isCurrent(ciphertext: string): boolean {
    try {
      this.decryptWith(this.key, ciphertext)
      return true
    } catch {
      return false
    }
  }

  private decryptWith(key: Buffer, ciphertext: string): string {
    const data = Buffer.from(ciphertext, 'base64')
    const iv = data.subarray(0, IV_LENGTH)
    const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
    const encrypted = data.subarray(IV_LENGTH + TAG_LENGTH)
    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)
    return decipher.update(encrypted) + decipher.final('utf8')
  }
}
