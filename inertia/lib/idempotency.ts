import { useRef } from 'react'

/**
 * One key per submit attempt: a double click or a retry after a dropped connection replays the
 * first answer instead of placing a second order. Call `renew()` after an error so the user can
 * fix the form and try again.
 */
export function useIdempotencyKey() {
  const key = useRef(crypto.randomUUID())
  return {
    headers: () => ({ 'Idempotency-Key': key.current }),
    renew: () => {
      key.current = crypto.randomUUID()
    },
  }
}
