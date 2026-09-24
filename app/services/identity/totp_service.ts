import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const STEP_SECONDS = 30
const DIGITS = 6

function base32Encode(buffer: Buffer): string {
  let bits = 0
  let value = 0
  let out = ''
  for (const byte of buffer) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31]
  return out
}

function base32Decode(input: string): Buffer {
  let bits = 0
  let value = 0
  const bytes: number[] = []
  for (const char of input.replaceAll('=', '').replaceAll(' ', '').toUpperCase()) {
    const index = ALPHABET.indexOf(char)
    if (index === -1) throw new Error('Invalid base32 secret')
    value = (value << 5) | index
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(bytes)
}

/** RFC 6238 time-based one-time passwords (SHA-1, 6 digits, 30 s) — what every authenticator app speaks. */
export default class TotpService {
  generateSecret(): string {
    return base32Encode(randomBytes(20))
  }

  otpauthUri(email: string, secret: string, issuer = 'Fabrmatch'): string {
    const label = encodeURIComponent(`${issuer}:${email}`)
    return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`
  }

  stepAt(nowMs: number): number {
    return Math.floor(nowMs / 1000 / STEP_SECONDS)
  }

  codeForStep(secret: string, step: number): string {
    const counter = Buffer.alloc(8)
    counter.writeBigUInt64BE(BigInt(step))
    const digest = createHmac('sha1', base32Decode(secret)).update(counter).digest()
    const offset = digest[digest.length - 1] & 0x0f
    const binary =
      ((digest[offset] & 0x7f) << 24) |
      (digest[offset + 1] << 16) |
      (digest[offset + 2] << 8) |
      digest[offset + 3]
    return String(binary % 10 ** DIGITS).padStart(DIGITS, '0')
  }

  /**
   * Returns the matched step (so the caller can refuse a replay of the same or an older step),
   * or null. Allows one step of clock drift either way.
   */
  verify(
    secret: string,
    code: string,
    options: { nowMs?: number; lastStep?: number | null } = {}
  ): number | null {
    const candidate = code.replaceAll(/\s/g, '')
    if (!/^\d{6}$/.test(candidate)) return null
    const current = this.stepAt(options.nowMs ?? Date.now())
    for (const step of [current - 1, current, current + 1]) {
      if (options.lastStep !== null && options.lastStep !== undefined && step <= options.lastStep) {
        continue
      }
      const expected = Buffer.from(this.codeForStep(secret, step))
      if (timingSafeEqual(expected, Buffer.from(candidate))) return step
    }
    return null
  }
}
