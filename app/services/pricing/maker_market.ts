import db from '@adonisjs/lucid/services/db'
import fabrmatchConfig from '#config/fabrmatch'
import type { BudgetRules } from '#services/pricing/maker_budget'
import { toBaseMinor } from '#services/pricing/fx'
import { makerCost } from '#services/pricing/maker_cost'
import MakerCostProfileService, {
  profitLimits,
  type MakerCosts,
} from '#services/manufacturing/maker_cost_profile_service'

/** One order line as a maker prints it: all units together, TRY. */
export interface WorkLine {
  material: string
  grams: number
  minutes: number
  finishingMinor: number
}

/** A maker who could print an order, with what their material costs them. */
export interface MarketMaker {
  manufacturerProfileId: string
  costs: MakerCosts
  /** material code → the cheapest spool they entered for it, per kg */
  materialCostPerKg: Map<string, number>
}

/**
 * What a maker is paid for the whole order (Paket V): their own costs and profit, line by line,
 * setup once per line. Null when they do not print one of the materials.
 */
export function orderFloor(maker: MarketMaker, lines: WorkLine[]): number | null {
  let total = 0
  for (const line of lines) {
    const perKg = maker.materialCostPerKg.get(line.material.toUpperCase())
    if (perKg === undefined) return null
    total += makerCost(
      { ...maker.costs, materialCostPerKgMinor: perKg },
      { grams: line.grams, minutes: line.minutes, finishingMinor: line.finishingMinor }
    ).floorMinor
  }
  return total
}

/** Costs of the given makers; a maker who has not entered theirs is the reference maker. */
export async function costsOf(profileIds: string[]): Promise<Map<string, MakerCosts>> {
  const defaults = new MakerCostProfileService().defaults()
  const { minBps, maxBps } = profitLimits()
  const result = new Map<string, MakerCosts>(profileIds.map((id) => [id, defaults]))
  if (profileIds.length === 0) return result
  const rows = await db
    .from('maker_cost_profiles')
    .whereIn('manufacturer_profile_id', profileIds)
    .select('*')
  for (const r of rows) {
    result.set(r.manufacturer_profile_id, {
      hourlyRateMinor: r.hourly_rate_minor,
      setupMinor: r.setup_minor,
      wasteBps: r.waste_bps,
      failureBps: r.failure_bps,
      profitBps: Math.min(Math.max(r.profit_bps, minBps), maxBps),
    })
  }
  return result
}

/**
 * Active makers in the delivery country with an active printer of the technology for every
 * material of the order. A price signal only: colours, build volume, capacity and trust are
 * checked when the order is matched (EligibilityService).
 */
export async function marketMakers(input: {
  country: string
  technology: string
  materials: string[]
}): Promise<MarketMaker[]> {
  const materials = [...new Set(input.materials.map((m) => m.toUpperCase()))]
  if (materials.length === 0) return []
  const rows = await db
    .from('printer_materials as pm')
    .join('printers as p', 'p.id', 'pm.printer_id')
    .join('manufacturer_profiles as mp', 'mp.id', 'p.manufacturer_profile_id')
    .where('mp.status', 'active')
    .where('mp.country', input.country.toUpperCase())
    .where('p.is_active', true)
    .where('p.technology', input.technology)
    // material codes are stored as the catalogue writes them (upper case)
    .whereIn('pm.material', materials)
    .groupBy('mp.id', 'pm.material')
    .select('mp.id as maker', 'pm.material')
    .min('pm.material_cost_per_kg_minor as cost')

  const byMaker = new Map<string, Map<string, number>>()
  for (const r of rows) {
    const map = byMaker.get(r.maker) ?? new Map<string, number>()
    map.set(String(r.material), Number(r.cost))
    byMaker.set(r.maker, map)
  }
  const complete = [...byMaker].filter(([, map]) => materials.every((m) => map.has(m)))
  const costs = await costsOf(complete.map(([id]) => id))
  return complete.map(([id, map]) => ({
    manufacturerProfileId: id,
    costs: costs.get(id)!,
    materialCostPerKg: map,
  }))
}

/** The fixed-price rules of /admin/settings → Maker pay. */
export function budgetRules(): BudgetRules {
  const pay = fabrmatchConfig.makerPay
  return {
    coverageBps: pay.quoteCoverageBps,
    lowBps: pay.quoteRangeLowBps,
    highBps: pay.quoteRangeHighBps,
    minMakers: pay.quoteMinMakers,
    fallbackBandBps: pay.quoteFallbackBandBps,
  }
}

/** The work of a placed order, TRY: what its makers' floors are computed from at matching. */
export function orderWorkLines(order: {
  fxRateNano?: bigint | number | null
  items: Array<{
    material: string
    estGrams: number
    estPrintMinutes: number
    finishingMinor: number
    quantity: number
  }>
}): WorkLine[] {
  const rate =
    order.fxRateNano === null || order.fxRateNano === undefined ? null : BigInt(order.fxRateNano)
  return order.items.map((i) => ({
    material: i.material.toUpperCase(),
    // estGrams is per unit, estPrintMinutes already for the whole line
    grams: i.estGrams * i.quantity,
    minutes: i.estPrintMinutes,
    finishingMinor: (rate ? toBaseMinor(i.finishingMinor, rate) : i.finishingMinor) * i.quantity,
  }))
}
