/** All FX maths is integer: BigInt with round-half-up. No float ever touches money. */
export const BASE_CURRENCY = 'TRY'
/** Two-decimal currencies only, so "minor unit" means the same thing everywhere. */
export const FOREIGN_CURRENCIES = ['USD', 'EUR', 'GBP'] as const
export type ForeignCurrency = (typeof FOREIGN_CURRENCIES)[number]
export const RATE_SCALE = 1_000_000_000n

export const isForeignCurrency = (code: string): code is ForeignCurrency =>
  (FOREIGN_CURRENCIES as readonly string[]).includes(code)

/** TRY minor units → foreign minor units at `rateE9` (foreign per 1 TRY, ×1e9). */
export function convertMinor(minor: number, rateE9: bigint): number {
  return Number((BigInt(minor) * rateE9 * 2n + RATE_SCALE) / (2n * RATE_SCALE))
}

/** Foreign minor units → TRY minor units at the same rate. */
export function toBaseMinor(minor: number, rateE9: bigint): number {
  return Number((BigInt(minor) * RATE_SCALE * 2n + rateE9) / (2n * rateE9))
}

/** "41.1734" → 41173400 (micro-units), exactly, from a decimal string. Throws on anything else. */
export function decimalToMicro(text: string): bigint {
  const match = /^(\d{1,9})(?:[.,](\d{1,9}))?$/.exec(text.trim())
  if (!match) throw new Error(`Not a decimal number: "${text}"`)
  const fraction = (match[2] ?? '').padEnd(6, '0').slice(0, 6)
  return BigInt(match[1]) * 1_000_000n + BigInt(fraction)
}

/** Foreign per 1 TRY (×1e9) from "TRY per 1 foreign unit" given in micro-units. */
export function rateFromTryPerUnit(tryPerUnitMicro: bigint): bigint {
  if (tryPerUnitMicro <= 0n) throw new Error('Rate must be positive')
  return (10n ** 15n + tryPerUnitMicro / 2n) / tryPerUnitMicro
}

/** Widens a rate so the buyer pays a little more foreign currency than the mid rate (FX buffer). */
export function withMargin(rateE9: bigint, marginBps: number): bigint {
  const bps = BigInt(marginBps)
  return (rateE9 * 10_000n + (10_000n - bps) - 1n) / (10_000n - bps)
}
