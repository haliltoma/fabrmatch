import { DateTime } from 'luxon'
import Printer from '#models/printer'
import type Order from '#models/order'
import type OrderItem from '#models/order_item'
import fabrmatchConfig from '#config/fabrmatch'
import db from '@adonisjs/lucid/services/db'
import { referencePriceFor } from '#services/pricing/reference_prices'
import type { MatchCandidate } from '#services/matching/types'
import MakerStatsService from '#services/manufacturing/maker_stats_service'

type Dims = [number, number, number]

/** Any axis-aligned 90° rotation allowed: compare sorted dimensions. */
export function fitsBuildVolume(part: Dims, build: Dims): boolean {
  const p = [...part].sort((a, b) => b - a)
  const v = [...build].sort((a, b) => b - a)
  return p.every((d, i) => d <= v[i])
}

/** The platform pays the reference price per gram; a maker asking more is not matched (R2-T4). */
export function makerPriceFits(makerPricePerGramMinor: number, material: string): boolean {
  const reference = referencePriceFor(material)
  return !reference || makerPricePerGramMinor <= reference.pricePerGramMinor
}

function supportsItem(printer: Printer, item: OrderItem, checkPrice = true): boolean {
  return printer.materials.some(
    (m) =>
      m.material.toUpperCase() === item.material.toUpperCase() &&
      (!checkPrice || makerPriceFits(m.pricePerGramMinor, item.material)) &&
      (!item.color || m.colors.some((c) => c.toLowerCase() === item.color!.toLowerCase()))
  )
}

function toDateString(value: unknown): string {
  if (value instanceof Date) return DateTime.fromJSDate(value).toISODate()!
  return String(value).slice(0, 10)
}

interface FindOptions {
  excludeManufacturerIds?: number[]
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
    const to = now.plus({ days: fabrmatchConfig.orders.productionSlaDays }).toISODate()!
    const excludedUserIds = [order.buyerId, order.sellerId].filter((id): id is number => !!id)
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
    let awardedTo: number | null = null
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
          ) && supportsItem(printer, item, order.channel !== 'rfq')
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
        .whereIn('print_profile_id', wanted as number[])
      const byPrinter = new Map<number, Set<number>>()
      for (const row of offered) {
        const set = byPrinter.get(row.printer_id) ?? new Set<number>()
        set.add(row.print_profile_id)
        byPrinter.set(row.printer_id, set)
      }
      for (let i = eligible.length - 1; i >= 0; i--) {
        const have = byPrinter.get(eligible[i].id)
        if (!wanted.every((id) => have?.has(id as number))) eligible.splice(i, 1)
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
      const byMaker = new Map<number, Set<string>>()
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

    // One candidate per manufacturer: the printer with the earliest free slot.
    const best = new Map<number, Printer>()
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
      }
    })
  }
}
