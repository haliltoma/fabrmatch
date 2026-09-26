import { useRef } from 'react'

/**
 * `crypto.randomUUID` only exists in secure contexts (https or localhost), so pages opened over
 * plain http on a LAN IP or 0.0.0.0 would crash. `getRandomValues` works everywhere.
 */
function newKey(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/**
 * One key per submit attempt: a double click or a retry after a dropped connection replays the
 * first answer instead of placing a second order. Call `renew()` after an error so the user can
 * fix the form and try again.
 */
export function useIdempotencyKey() {
  const key = useRef<string>(null)
  key.current ??= newKey()
  return {
    headers: () => ({ 'Idempotency-Key': key.current! }),
    renew: () => {
      key.current = newKey()
    },
  }
}
