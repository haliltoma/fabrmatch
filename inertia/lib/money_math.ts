/**
 * TRY minor units → another currency's minor units at `rateE9` (that currency per 1 TRY, ×1e9).
 * Integer maths with round-half-up, identical to the server's `convertMinor`, so a converted
 * browse price never disagrees with what the server would compute.
 */
export function convertTryMinor(minor: number, rateE9: string): number {
  const scale = 1_000_000_000n
  return Number((BigInt(minor) * BigInt(rateE9) * 2n + scale) / (2n * scale))
}
