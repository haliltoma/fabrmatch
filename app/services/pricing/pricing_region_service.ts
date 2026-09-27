import PricingRegion from '#models/pricing_region'
import type { RoundingRule } from '#services/pricing/pricing_region_defaults'
import { referencePriceFor } from '#services/pricing/reference_prices'

/**
 * Lifts a unit price to the region's rounding rule. Never lowers it, so the maker's share and the
 * shipping are always covered; the difference is added to the platform commission by the caller.
 */
export function roundUnitMinor(minor: number, rule: RoundingRule): number {
  if (rule === 'whole') return Math.ceil(minor / 100) * 100
  if (rule === 'charm99') return Math.floor(minor / 100) * 100 + 99
  return minor
}

/** The region's own price when it has one, else the base price scaled by its multiplier (up). */
export function regionalReferenceMinor(
  baseMinor: number,
  multiplierBps: number,
  overrideMinor: number | null
): number {
  if (overrideMinor !== null) return overrideMinor
  return Math.ceil((baseMinor * multiplierBps) / 10_000)
}

export default class PricingRegionService {
  /** The region a delivery country belongs to; the fallback region when none lists it. */
  async forCountry(country: string): Promise<PricingRegion> {
    const code = country.trim().toUpperCase()
    const region =
      (await PricingRegion.query()
        .whereRaw('countries @> ?::jsonb', [JSON.stringify([code])])
        .preload('materials')
        .first()) ??
      (await PricingRegion.query().where('isFallback', true).preload('materials').firstOrFail())
    return region
  }

  /** Reference price per gram in this region, or null for a material the platform does not sell. */
  referenceFor(region: PricingRegion, material: string): number | null {
    const base = referencePriceFor(material)
    if (!base) return null
    const override = region.materials?.find(
      (m) => m.material.toUpperCase() === material.toUpperCase()
    )
    return regionalReferenceMinor(
      base.pricePerGramMinor,
      region.referenceMultiplierBps,
      override?.pricePerGramMinor ?? null
    )
  }
}
