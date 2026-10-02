import { DateTime } from 'luxon'
import Printer from '#models/printer'
import type Order from '#models/order'
import type OrderItem from '#models/order_item'
import db from '@adonisjs/lucid/services/db'
import { referencePriceFor } from '#services/pricing/reference_prices'
import PricingRegion from '#models/pricing_region'
import PricingRegionService from '#services/pricing/pricing_region_service'
import type { MatchCandidate } from '#services/matching/types'
import MakerStatsService from '#services/manufacturing/maker_stats_service'
import { productionDaysForOrder } from '#services/orders/production_window'
import { costsOf, orderFloor, orderWorkLines, type WorkLine } from '#services/pricing/maker_market'
import type { MakerCosts } from '#services/manufacturing/maker_cost_profile_service'

type Dims = [number, number, number]

/** Any axis-aligned 90° rotation allowed: compare sorted dimensions. */
export function fitsBuildVolume(part: Dims, build: Dims): boolean {
  const p = [...part].sort((a, b) => b - a)
  const v = [...build].sort((a, b) => b - a)
  return p.every((d, i) => d <= v[i])
}

/**
 * The platform prices material at the reference per gram; a maker whose material costs more is not
 * matched (R2-T4). `referenceMinor` is the order's regional reference per gram (P2); without it the
 * base reference applies. The maker's cost is per kilogram (Paket V).
 */
export function makerPriceFits(
  makerCostPerKgMinor: number,
  material: string,
  referenceMinor?: number | null
): boolean {
  const reference = referenceMinor ?? referencePriceFor(material)?.pricePerGramMinor ?? null
  return reference === null || makerCostPerKgMinor <= reference * 1000
}

/** The reference per gram for each material of an order, under its pricing region's rules. */
export async function orderReferences(
  order: Order,
  materials: string[]
): Promise<Map<string, number | null>> {
  const regions = new PricingRegionService()
  const region = order.pricingRegionId
    ? await PricingRegion.query().where('id', order.pricingRegionId).preload('materials').first()
    : null
  const resolved = region ?? (await regions.forCountry(order.shipCountry))
  return new Map(
    materials.map((m) => [m.toUpperCase(), regions.referenceFor(resolved, m)] as const)
  )
}

function supportsItem(
  printer: Printer,
  item: OrderItem,
  checkPrice = true,
  references?: Map<string, number | null>
): boolean {
  return printer.materials.some(
    (m) =>
      m.material.toUpperCase() === item.material.toUpperCase() &&
      (!checkPrice ||
        makerPriceFits(
          m.materialCostPerKgMinor,
          item.material,
          references?.get(item.material.toUpperCase())
        )) &&
      (!item.color || m.colors.some((c) => c.toLowerCase() === item.color!.toLowerCase()))
  )
}

/** A maker's price for the order on one printer (its own material costs), TRY; null = cannot. */
export function printerFloor(
  printer: {
    manufacturerProfileId: string
    materials: Array<{ material: string; materialCostPerKgMinor: number }>
  },
  costs: MakerCosts,
  lines: WorkLine[]
): number | null {
  const materialCostPerKg = new Map<string, number>()
  for (const m of printer.materials) {
    const code = m.material.toUpperCase()
    const current = materialCostPerKg.get(code)
    if (current === undefined || m.materialCostPerKgMinor < current) {
      materialCostPerKg.set(code, m.materialCostPerKgMinor)
    }
  }
  return orderFloor(
    { manufacturerProfileId: printer.manufacturerProfileId, costs, materialCostPerKg },
    lines
  )
}

function toDateString(value: unknown): string {
  if (value instanceof Date) return DateTime.fromJSDate(value).toISODate()!
  return String(value).slice(0, 10)
}

interface FindOptions {
  excludeManufacturerIds?: string[]
  buyerCity?: string | null
  now?: DateTime
}

export default class EligibilityService {
  async findCandidates(order: Order, options: FindOptions = {}): Promise<MatchCandidate[]> {
    await order.load('items', (q) => q.preload('modelFile'))
    const items = order.items
    if (items.length === 0) return []

    // v1: an order is produced on a single printer → one technology.
    const technology = items[0].technology
    if (items.some((i) => i.technology !== technology)) return []

    const requiredMinutes = items.reduce((sum, i) => sum + i.estPrintMinutes, 0)
    const now = options.now ?? DateTime.now()
    const from = now.toISODate()!
    const to = now.plus({ days: await productionDaysForOrder({ ...order, items }) }).toISODate()!
    const excludedUserIds = [order.buyerId, order.sellerId].filter((id): id is string => !!id)
    const excludedProfileIds = options.excludeManufacturerIds ?? []

    const printers = await Printer.query()
      .where('isActive', true)
      .where('technology', technology)
      .whereHas('manufacturerProfile', (q) => {
        q.where('status', 'active')
          .where('trustTier', '>=', order.requiredTrustTier)
          .where('country', order.shipCountry)
          .whereNotIn('userId', excludedUserIds)
          .whereHas('user', (u) => u.whereNull('suspendedAt'))
        if (excludedProfileIds.length > 0) q.whereNotIn('id', excludedProfileIds)
      })
      .preload('materials')
      .preload('manufacturerProfile')
      .preload('capacitySlots', (q) => {
        q.where('date', '>=', from)
          .where('date', '<=', to)
          .whereRaw('max_minutes - reserved_minutes >= ?', [requiredMinutes])
          .orderBy('date', 'asc')
      })
      .orderBy('id', 'asc')

    // an RFQ order was awarded to one maker: only they can be offered it, and their bid, not the
    // platform's reference price, is the price
    let awardedTo: string | null = null
    if (order.channel === 'rfq') {
      const awarded = await db
        .from('rfqs')
        .join('rfq_bids', 'rfq_bids.id', 'rfqs.awarded_bid_id')
        .where('rfqs.order_id', order.id)
        .select('rfq_bids.manufacturer_profile_id as maker')
        .first()
      if (!awarded) return []
      awardedTo = awarded.maker
    }

    // Paket V: an order priced on the market checks each maker's own floor against its budget
    // (below); an older order keeps the price-per-gram cap; an RFQ's price is the awarded bid
    const budget = order.channel === 'rfq' ? null : order.makerBudgetMinor
    const checkGramPrice = order.channel !== 'rfq' && budget === null
    const references = await orderReferences(
      order,
      items.map((i) => i.material)
    )
    const eligible = printers.filter((printer) => {
      if (awardedTo !== null && printer.manufacturerProfileId !== awardedTo) return false
      if (printer.capacitySlots.length === 0) return false
      const build: Dims = [printer.buildVolumeXMm, printer.buildVolumeYMm, printer.buildVolumeZMm]
      return items.every((item) => {
        const f = item.modelFile
        if (f.bboxXMm === null || f.bboxYMm === null || f.bboxZMm === null) return false
        return (
          fitsBuildVolume(
            [f.bboxXMm, f.bboxYMm, f.bboxZMm].map(
              (d) => (d * (item.scalePercent ?? 100)) / 100
            ) as Dims,
            build
          ) && supportsItem(printer, item, checkGramPrice, references)
        )
      })
    })

    // items that name a print profile only go to printers that declared it
    const wanted = [...new Set(items.map((i) => i.printProfileId).filter((id) => id !== null))]
    if (wanted.length > 0 && eligible.length > 0) {
      const offered = await db
        .from('printer_print_profiles')
        .whereIn(
          'printer_id',
          eligible.map((p) => p.id)
        )
        .whereIn('print_profile_id', wanted as string[])
      const byPrinter = new Map<string, Set<string>>()
      for (const row of offered) {
        const set = byPrinter.get(row.printer_id) ?? new Set<string>()
        set.add(row.print_profile_id)
        byPrinter.set(row.printer_id, set)
      }
      for (let i = eligible.length - 1; i >= 0; i--) {
        const have = byPrinter.get(eligible[i].id)
        if (!wanted.every((id) => have?.has(id as string))) eligible.splice(i, 1)
      }
    }

    // items that ask for a finishing only go to makers who declared they offer it
    const finishings = [...new Set(items.map((i) => i.finishingCode).filter((c) => c !== null))]
    if (finishings.length > 0 && eligible.length > 0) {
      const offered = await db
        .from('manufacturer_finishings as mf')
        .join('finishing_options as fo', 'fo.id', 'mf.finishing_option_id')
        .whereIn('mf.manufacturer_profile_id', [
          ...new Set(eligible.map((p) => p.manufacturerProfileId)),
        ])
        .whereIn('fo.code', finishings as string[])
        .select('mf.manufacturer_profile_id', 'fo.code')
      const byMaker = new Map<string, Set<string>>()
      for (const row of offered) {
        const set = byMaker.get(row.manufacturer_profile_id) ?? new Set<string>()
        set.add(row.code)
        byMaker.set(row.manufacturer_profile_id, set)
      }
      for (let i = eligible.length - 1; i >= 0; i--) {
        const have = byMaker.get(eligible[i].manufacturerProfileId)
        if (!finishings.every((code) => have?.has(code as string))) eligible.splice(i, 1)
      }
    }

    // Paket V: a printer fits a market-priced order when its maker's own price for the whole order,
    // with that printer's material costs, is within the order's maker budget
    const pay = new Map<string, number>()
    if (budget !== null && eligible.length > 0) {
      const lines = orderWorkLines({ fxRateNano: order.fxRateNano, items })
      const costs = await costsOf([...new Set(eligible.map((p) => p.manufacturerProfileId))])
      for (let i = eligible.length - 1; i >= 0; i--) {
        const printer = eligible[i]
        const floor = printerFloor(printer, costs.get(printer.manufacturerProfileId)!, lines)
        if (floor === null || floor > budget) eligible.splice(i, 1)
        else pay.set(printer.id, floor)
      }
    }

    // One candidate per manufacturer: the printer with the earliest free slot.
    const best = new Map<string, Printer>()
    for (const p of eligible) {
      const current = best.get(p.manufacturerProfileId)
      if (
        !current ||
        toDateString(p.capacitySlots[0].date) < toDateString(current.capacitySlots[0].date)
      ) {
        best.set(p.manufacturerProfileId, p)
      }
    }
    if (best.size === 0) return []

    const stats = await new MakerStatsService().load([...best.keys()])
    const buyerCity = options.buyerCity?.trim().toLocaleLowerCase('tr') ?? null

    return [...best.values()].map((printer) => {
      const profile = printer.manufacturerProfile
      const s = stats.get(profile.id)
      return {
        manufacturerProfileId: profile.id,
        printerId: printer.id,
        slotDate: toDateString(printer.capacitySlots[0].date),
        joinedDaysAgo: Math.floor(now.diff(profile.createdAt, 'days').days),
        completedJobs: s?.completed ?? 0,
        avgRating: s?.avgRating ?? null,
        disputeRate: s && s.total > 0 ? s.disputed / s.total : 0,
        onTimeRate: s && s.shipped > 0 ? s.onTime / s.shipped : null,
        activeJobs: s?.active ?? 0,
        sameCity: !!buyerCity && profile.city?.trim().toLocaleLowerCase('tr') === buyerCity,
        makerPayMinor: pay.get(printer.id) ?? null,
      }
    })
  }
}
