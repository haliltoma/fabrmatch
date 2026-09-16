import { createHmac } from 'node:crypto'
import { SIGNATURE_HEADER, TIMESTAMP_HEADER } from '#services/contract/types'

/** v1 imza: hex(HMAC-SHA256(secret, "{timestamp}.{ham gövde}")) — Sistem A ile birebir aynı. */
export function signPayload(secret: string, timestamp: string, rawBody: string): string {
  const digest = createHmac('sha256', secret).update(`${timestamp}.`).update(rawBody).digest('hex')
  return `v1=${digest}`
}

export function signedWebhookHeaders(secret: string, rawBody: string, now = Date.now()) {
  const timestamp = String(Math.floor(now / 1000))
  return {
    'content-type': 'application/json',
    [TIMESTAMP_HEADER]: timestamp,
    [SIGNATURE_HEADER]: signPayload(secret, timestamp, rawBody),
  }
}
