import db from '@adonisjs/lucid/services/db'

export interface TaxSplit {
  rateBps: number
  /** gross − tax; net + tax always equals gross exactly */
  netMinor: number
  taxMinor: number
}

/**
 * Prices are shown tax-inclusive (KDV dahil). The tax inside a gross amount is
 * gross × rate / (10 000 + rate), rounded half up to a whole minor unit; the net is the
 * remainder, so net + tax == gross with no cent ever lost or invented.
 */
export function splitGross(grossMinor: number, rateBps: number): TaxSplit {
  if (!Number.isSafeInteger(grossMinor) || grossMinor < 0)
    throw new Error('Gross must be a non-negative integer')
  if (!Number.isInteger(rateBps) || rateBps < 0)
    throw new Error('Rate must be a non-negative integer')
  const taxMinor = Math.floor(
    (grossMinor * rateBps * 2 + (10_000 + rateBps)) / (2 * (10_000 + rateBps))
  )
  return { rateBps, taxMinor, netMinor: grossMinor - taxMinor }
}

/** Rate for the destination country; none configured → no tax line (0). */
export async function taxRateFor(
  country: string
): Promise<{ rateBps: number; name: string | null }> {
  const row = await db
    .from('tax_rates')
    .where('country', country.trim().toUpperCase())
    .where('is_active', true)
    .first()
  return row
    ? { rateBps: row.rate_bps as number, name: row.name as string }
    : { rateBps: 0, name: null }
}
