/**
 * What one print costs a maker and the least they are paid for it (Paket V, K-V1/K-V2). Pure and
 * shared with the browser (the maker's "what I earn" preview), so the page and the matching can
 * never disagree. Money is integer minor units; rates are basis points; every step rounds up, so
 * a maker is never paid a kuruş below their own numbers.
 *
 *   cost  = (material × (1 + waste) + machine time + setup) ÷ (1 − failure rate)
 *   floor = cost × (1 + profit) + finishing
 */

export interface CostProfile {
  /** filament or resin, per kilogram */
  materialCostPerKgMinor: number
  /** machine time: power, wear, the printer paying itself off */
  hourlyRateMinor: number
  /** once per print job: preparing, removing supports, packing */
  setupMinor: number
  /** extra material lost to purging, brims and supports, in basis points (1000 = 10 %) */
  wasteBps: number
  /** share of prints that fail and are printed again, in basis points (500 = 5 %) */
  failureBps: number
  /** the maker's profit on top of cost, in basis points (2500 = 25 %) */
  profitBps: number
}

export interface PrintWork {
  grams: number
  minutes: number
  /** post-processing the maker does (sanding, painting), paid as quoted */
  finishingMinor?: number
}

export interface MakerCostBreakdown {
  materialMinor: number
  machineMinor: number
  setupMinor: number
  /** cost after the failure allowance */
  costMinor: number
  profitMinor: number
  finishingMinor: number
  /** what the maker is paid: cost + profit + finishing */
  floorMinor: number
}

const BPS = 10_000

export function makerCost(profile: CostProfile, work: PrintWork): MakerCostBreakdown {
  if (profile.failureBps < 0 || profile.failureBps >= BPS) {
    throw new RangeError('The failure rate must be at least 0 % and below 100 %')
  }
  // grams come from the slicer or the volume estimate and are not whole: round the result up once
  const materialMinor = Math.ceil(
    (profile.materialCostPerKgMinor * work.grams * (BPS + profile.wasteBps)) / (1000 * BPS)
  )
  const machineMinor = Math.ceil((work.minutes * profile.hourlyRateMinor) / 60)
  const direct = materialMinor + machineMinor + profile.setupMinor
  const costMinor = Math.ceil((direct * BPS) / (BPS - profile.failureBps))
  const profitMinor = Math.ceil((costMinor * profile.profitBps) / BPS)
  const finishingMinor = work.finishingMinor ?? 0
  return {
    materialMinor,
    machineMinor,
    setupMinor: profile.setupMinor,
    costMinor,
    profitMinor,
    finishingMinor,
    floorMinor: costMinor + profitMinor + finishingMinor,
  }
}

/** The profit a maker may pick: the admin's minimum up to the admin's maximum. */
export function clampProfitBps(profitBps: number, minBps: number, maxBps: number): number {
  return Math.min(Math.max(profitBps, minBps), Math.max(minBps, maxBps))
}
