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
  /** V5: added to their price for an order delivered to another city */
  otherCityBps: number
  /** V5: the same for abroad (stored; used once cross-border production opens, K-K) */
  abroadBps: number
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
      otherCityBps: 0,
      abroadBps: 0,
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
      otherCityBps: Math.min(row.otherCityBps, fabrmatchConfig.makerPay.maxDistanceBps),
      abroadBps: Math.min(row.abroadBps, fabrmatchConfig.makerPay.maxDistanceBps),
      saved: true,
    }
  }

  /** The distance surcharges are optional here: absent means none. */
  async save(
    manufacturerProfileId: string,
    input: Omit<MakerCosts, 'otherCityBps' | 'abroadBps'> &
      Partial<Pick<MakerCosts, 'otherCityBps' | 'abroadBps'>>
  ): Promise<MakerCostProfile> {
    const costs: MakerCosts = { otherCityBps: 0, abroadBps: 0, ...input }
    const { minBps, maxBps } = profitLimits()
    if (costs.profitBps < minBps || costs.profitBps > maxBps) {
      throw new MakerCostProfileError(
        `Your profit must be between ${minBps / 100}% and ${maxBps / 100}%`
      )
    }
    const maxDistance = fabrmatchConfig.makerPay.maxDistanceBps
    if (
      costs.otherCityBps < 0 ||
      costs.abroadBps < 0 ||
      costs.otherCityBps > maxDistance ||
      costs.abroadBps > maxDistance
    ) {
      throw new MakerCostProfileError(
        `A distance surcharge must be between 0% and ${maxDistance / 100}%`
      )
    }
    if (costs.failureBps >= 10_000) {
      throw new MakerCostProfileError('The failed-print rate must be below 100%')
    }
    return MakerCostProfile.updateOrCreate({ manufacturerProfileId }, { ...costs })
  }
}
