import DomainError from '#exceptions/domain_error'
import fabrmatchConfig from '#config/fabrmatch'
import MakerCostProfile from '#models/maker_cost_profile'

export class MakerCostProfileError extends DomainError {}

/** A maker's costs as the forms and maker_cost.ts use them (no material: that is per printer). */
export interface MakerCosts {
  hourlyRateMinor: number
  setupMinor: number
  wasteBps: number
  failureBps: number
  profitBps: number
}

/** The limits a maker's profit must stay within, from /admin/settings → Maker pay. */
export function profitLimits() {
  const { minProfitBps, maxProfitBps } = fabrmatchConfig.makerPay
  return { minBps: minProfitBps, maxBps: Math.max(minProfitBps, maxProfitBps) }
}

/**
 * Paket V: each maker's own costs and profit. A maker who has not filled them in yet is priced as
 * the reference maker of the admin settings, at the minimum profit.
 */
export default class MakerCostProfileService {
  defaults(): MakerCosts {
    const pay = fabrmatchConfig.makerPay
    return {
      hourlyRateMinor: pay.referenceHourlyRateMinor,
      setupMinor: pay.referenceSetupMinor,
      wasteBps: pay.referenceWasteBps,
      failureBps: pay.referenceFailureBps,
      profitBps: pay.minProfitBps,
    }
  }

  /** The maker's saved costs, or the defaults; `saved` tells the page which one it is showing. */
  async forMaker(manufacturerProfileId: string): Promise<MakerCosts & { saved: boolean }> {
    const row = await MakerCostProfile.findBy('manufacturerProfileId', manufacturerProfileId)
    if (!row) return { ...this.defaults(), saved: false }
    // the admin may have moved the limits since the maker saved: their profit follows
    const { minBps, maxBps } = profitLimits()
    return {
      hourlyRateMinor: row.hourlyRateMinor,
      setupMinor: row.setupMinor,
      wasteBps: row.wasteBps,
      failureBps: row.failureBps,
      profitBps: Math.min(Math.max(row.profitBps, minBps), maxBps),
      saved: true,
    }
  }

  async save(manufacturerProfileId: string, costs: MakerCosts): Promise<MakerCostProfile> {
    const { minBps, maxBps } = profitLimits()
    if (costs.profitBps < minBps || costs.profitBps > maxBps) {
      throw new MakerCostProfileError(
        `Your profit must be between ${minBps / 100}% and ${maxBps / 100}%`
      )
    }
    if (costs.failureBps >= 10_000) {
      throw new MakerCostProfileError('The failed-print rate must be below 100%')
    }
    return MakerCostProfile.updateOrCreate({ manufacturerProfileId }, { ...costs })
  }
}
