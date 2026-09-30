import { useSyncExternalStore } from 'react'

const noop = () => () => {}

/**
 * False on the server and during hydration, true afterwards. Anything that depends on "now" (a
 * countdown, a relative time) renders a neutral placeholder until then, so the server HTML and the
 * first client render agree.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false
  )
}
