export interface ShippingZoneData {
  code: string
  countries: string[]
  isFallback: boolean
  extraPerKgMinor: number
  currency: string
  transitDaysMin: number
  transitDaysMax: number
  /** ascending by upToGrams */
  tiers: Array<{ upToGrams: number; priceMinor: number }>
}

/** Grams a parcel is charged for: packaging included, never less than its volumetric weight. */
export const PACKAGING_GRAMS = 60
/** 1 kg per 5000 cm³ — the usual courier divisor. mm³ / 5000 = grams. */
const VOLUMETRIC_DIVISOR_MM3_PER_GRAM = 5000

export interface ParcelInput {
  country: string
  gramsPerUnit: number
  bboxMm?: [number, number, number] | null
  quantity: number
}

/** A snapshot of the rate tables; pure and synchronous so pricing code stays simple. */
export default class ShippingTable {
  constructor(private zones: ShippingZoneData[]) {}

  zoneFor(country: string): ShippingZoneData {
    const code = country.trim().toUpperCase()
    const zone =
      this.zones.find((z) => z.countries.includes(code)) ?? this.zones.find((z) => z.isFallback)
    if (!zone) throw new Error('No shipping zone covers this country and no fallback is set')
    return zone
  }

  chargeableGrams(input: ParcelInput): number {
    return this.chargeableGramsForItems([input])
  }

  /** One parcel for all lines: packaging counted once, volumetric weight summed. */
  chargeableGramsForItems(lines: Array<Omit<ParcelInput, 'country'>>): number {
    const actual = lines.reduce((sum, l) => sum + l.gramsPerUnit * l.quantity, PACKAGING_GRAMS)
    const volumetric = lines.reduce(
      (sum, l) =>
        sum +
        (l.bboxMm
          ? (l.bboxMm[0] * l.bboxMm[1] * l.bboxMm[2] * l.quantity) / VOLUMETRIC_DIVISOR_MM3_PER_GRAM
          : 0),
      0
    )
    return Math.ceil(Math.max(actual, volumetric))
  }

  /** Price of the whole parcel. */
  parcelMinor(input: ParcelInput) {
    return this.parcelForItems(input.country, [input])
  }

  parcelForItems(
    country: string,
    lines: Array<Omit<ParcelInput, 'country'>>
  ): { minor: number; currency: string; chargeableGrams: number } {
    const zone = this.zoneFor(country)
    const grams = this.chargeableGramsForItems(lines)
    const tier = zone.tiers.find((t) => grams <= t.upToGrams)
    if (tier) return { minor: tier.priceMinor, currency: zone.currency, chargeableGrams: grams }

    const top = zone.tiers[zone.tiers.length - 1]
    const extraKg = Math.ceil((grams - top.upToGrams) / 1000)
    return {
      minor: top.priceMinor + extraKg * zone.extraPerKgMinor,
      currency: zone.currency,
      chargeableGrams: grams,
    }
  }

  /**
   * The price engine multiplies a per-unit shipping share by the quantity, so the parcel price is
   * split upwards: the buyer may pay up to (quantity − 1) minor units more, never less.
   */
  perUnitMinor(input: ParcelInput): number {
    return Math.ceil(this.parcelMinor(input).minor / input.quantity)
  }
}

/** Bounding box of an analysed model file, or null when it was not measured. */
export function bboxOf(file: {
  bboxXMm: number | null
  bboxYMm: number | null
  bboxZMm: number | null
}): [number, number, number] | null {
  return file.bboxXMm !== null && file.bboxYMm !== null && file.bboxZMm !== null
    ? [file.bboxXMm, file.bboxYMm, file.bboxZMm]
    : null
}
