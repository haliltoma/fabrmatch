import fabrmatchConfig from '#config/fabrmatch'
import { makerCost, type CostProfile } from '#services/pricing/maker_cost'

/**
 * Pure price calculation engine — no I/O, no side effects.
 * All money values are integers in minor units (kuruş/cent).
 * PRD §7 formula.
 */

/** Material density in g/mm³ */
const MATERIAL_DENSITY: Record<string, number> = {
  PLA: 0.00124,
  PETG: 0.00127,
  ABS: 0.00104,
  TPU: 0.00121,
  NYLON: 0.00114,
  RESIN: 0.00113,
}

/** Default infill ratio (0-1) — first version uses heuristic */
const DEFAULT_INFILL = 0.2

/**
 * The reference maker: the costs the platform prices with (admin settings → Maker pay). Material
 * comes from the pricing region's price per gram; the rest is the same everywhere.
 */
export function referenceCostProfile(pricePerGramMinor: number): CostProfile {
  const pay = fabrmatchConfig.makerPay
  return {
    materialCostPerKgMinor: pricePerGramMinor * 1000,
    hourlyRateMinor: pay.referenceHourlyRateMinor,
    setupMinor: pay.referenceSetupMinor,
    wasteBps: pay.referenceWasteBps,
    failureBps: pay.referenceFailureBps,
    profitBps: pay.minProfitBps,
  }
}

/** Default estimated shipping cost in minor units */
const DEFAULT_SHIPPING_MINOR = 5000 // 50 TL

export interface PriceInput {
  volumeMm3: number
  material: string
  pricePerGramMinor: number
  quantity: number
  sellerMarginBps: number
  estPrintMinutes?: number
  /** measured by the slicer; replaces the volume-based heuristic when present */
  estGrams?: number
  infill?: number
  /** the maker's costs; default: the reference maker for `pricePerGramMinor` */
  costProfile?: CostProfile
  commissionBps?: number
  shippingMinor?: number
  /** post-processing per unit (TRY minor): the maker's work, so it is part of their share and earns the fee */
  finishingMinor?: number
}

export interface PriceBreakdown {
  estGrams: number
  materialCostMinor: number
  machineCostMinor: number
  manufacturerShareMinor: number
  finishingMinor: number
  platformCommissionMinor: number
  shippingMinor: number
  baseCostMinor: number
  sellerMarginMinor: number
  unitPriceMinor: number
  totalPriceMinor: number
  currency: string
}

/**
 * Estimate grams from volume.
 * est_grams = volume_mm3 × infill × density_g_per_mm3
 * For shell/walls, add ~10% extra over pure infill estimate.
 */
/** Density of a material relative to PLA — turns a PLA slice into grams for another filament. */
export function densityRatioToPla(material: string): number {
  return (MATERIAL_DENSITY[material.toUpperCase()] || MATERIAL_DENSITY.PLA) / MATERIAL_DENSITY.PLA
}

export function estimateGrams(volumeMm3: number, material: string, infill?: number): number {
  const density = MATERIAL_DENSITY[material.toUpperCase()] || MATERIAL_DENSITY.PLA
  const fillRatio = infill ?? DEFAULT_INFILL

  // Shell weight approximation: ~10% of total volume at solid density
  const shellFraction = 0.1
  const infillFraction = 1 - shellFraction

  const grams = volumeMm3 * density * (shellFraction + infillFraction * fillRatio)
  return Math.max(grams, 0.1) // Minimum 0.1g
}

/**
 * Estimate print time in minutes from grams (heuristic).
 * Rough: ~12 grams/hour for FDM.
 */
/** Grams the heuristic assumes one printer produces per hour (0.2 g/min). */
export const GRAMS_PER_PRINT_HOUR = 12

export function estimatePrintMinutes(estGrams: number): number {
  const gramsPerMinute = 0.2 // ~12g/h
  return Math.max(Math.ceil(estGrams / gramsPerMinute), 1)
}

/**
 * Calculate full price breakdown for a single unit, then multiply by quantity.
 * All rounding uses Math.ceil to avoid underpayment.
 */
export function calculatePrice(input: PriceInput): PriceBreakdown {
  const {
    volumeMm3,
    material,
    pricePerGramMinor,
    quantity,
    sellerMarginBps,
    infill,
    // single source of truth: config/fabrmatch.ts, overridden from /admin/settings
    commissionBps = fabrmatchConfig.pricing.commissionBps,
    shippingMinor = DEFAULT_SHIPPING_MINOR,
    finishingMinor = 0,
  } = input

  const estGrams = input.estGrams ?? estimateGrams(volumeMm3, material, infill)
  const estPrintMinutes = input.estPrintMinutes ?? estimatePrintMinutes(estGrams)

  // Manufacturer share = what the maker is paid per unit: cost × (1 + profit) + finishing
  // (maker_cost.ts); setup is once per line, so each unit carries its part
  const profile = input.costProfile ?? referenceCostProfile(pricePerGramMinor)
  const cost = makerCost(
    { ...profile, setupMinor: Math.ceil(profile.setupMinor / quantity) },
    { grams: estGrams, minutes: estPrintMinutes, finishingMinor }
  )
  const materialCostMinor = cost.materialMinor
  const machineCostMinor = cost.machineMinor
  const manufacturerShareMinor = cost.floorMinor

  // Platform commission = manufacturer_share × commission_bps / 10000
  const platformCommissionMinor = Math.ceil((manufacturerShareMinor * commissionBps) / 10_000)

  // Base cost = manufacturer_share + commission + shipping
  const baseCostMinor = manufacturerShareMinor + platformCommissionMinor + shippingMinor

  // Seller margin = base_cost × seller_margin_bps / 10000
  const sellerMarginMinor = Math.ceil((baseCostMinor * sellerMarginBps) / 10_000)

  // Unit price
  const unitPriceMinor = baseCostMinor + sellerMarginMinor

  // Total
  const totalPriceMinor = unitPriceMinor * quantity

  return {
    estGrams: Math.round(estGrams * 100) / 100,
    materialCostMinor,
    machineCostMinor,
    manufacturerShareMinor,
    finishingMinor,
    platformCommissionMinor,
    shippingMinor,
    baseCostMinor,
    sellerMarginMinor,
    unitPriceMinor,
    totalPriceMinor,
    currency: 'TRY',
  }
}
