/** Browser twin of the seller-margin step in app/services/pricing/price_engine.ts; tests keep them in step. */
export function marginSplit(costMinor: number, marginPercent: number) {
  const bps = Math.round(Math.min(Math.max(marginPercent, 0), 200) * 100)
  const earnsMinor = Math.ceil((costMinor * bps) / 10_000)
  return { earnsMinor, buyerPriceMinor: costMinor + earnsMinor }
}
