import { convertTryMinor } from '~/lib/money_math'

/** Shared by the server on every page (inertia_middleware `money`). */
export type SharedMoney = { display: string; charge: string; rates: Record<string, string> }

let active: SharedMoney = { display: 'TRY', charge: 'TRY', rates: {} }

/** Set by `useT()` from the page props, like the active locale. */
export function setActiveMoney(money: SharedMoney | undefined) {
  if (money) active = money
}

export function activeMoney(): SharedMoney {
  return active
}

/**
 * A browse price (shop, quotes, marketing) in the visitor's currency. Only amounts in the charge
 * currency are converted, at the day's mid rate; the result is an estimate and says so ("≈").
 * Real money — carts, orders, payouts, wallets — keeps using `formatMoney` in its own currency.
 */
export function convertPrice(
  minor: number,
  currency: string = 'TRY'
): { minor: number; currency: string; approx: boolean } {
  const rate = active.rates[active.display]
  if (currency !== active.charge || active.display === currency || !rate) {
    return { minor, currency, approx: false }
  }
  return { minor: convertTryMinor(minor, rate), currency: active.display, approx: true }
}
