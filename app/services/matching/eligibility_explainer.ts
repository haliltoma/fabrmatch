import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import ManufacturerProfile from '#models/manufacturer_profile'
import type Order from '#models/order'
import type OrderItem from '#models/order_item'
import type Printer from '#models/printer'
import {
  fitsBuildVolume,
  makerPriceFits,
  orderReferences,
  printerFloor,
} from '#services/matching/eligibility_service'
import { referencePriceFor } from '#services/pricing/reference_prices'
import { productionDaysForOrder } from '#services/orders/production_window'
import { costsOf, orderWorkLines, type WorkLine } from '#services/pricing/maker_market'
import type { MakerCosts } from '#services/manufacturing/maker_cost_profile_service'

/**
 * Why a maker is not offered an order. Each code is one rule of `EligibilityService.findCandidates`,
 * with the numbers an admin needs to fix it. The params are shown as-is next to a translated label.
 */
export type Reason =
  | { code: 'not_approved'; status: string }
  | { code: 'suspended' }
  | { code: 'is_buyer' }
  | { code: 'is_seller' }
  | { code: 'tier_too_low'; have: number; need: number }
  | { code: 'other_country'; country: string; need: string }
  | { code: 'already_offered'; status: string }
  | { code: 'rfq_awarded_elsewhere' }
  | { code: 'no_active_printer' }
  | { code: 'no_printer' }
  | { code: 'finishing_missing'; missing: string[] }
  | { code: 'wrong_technology'; have: string; need: string }
  | { code: 'too_small'; build: number[]; part: number[] }
  | { code: 'size_unknown' }
  | { code: 'material_missing'; material: string }
  | { code: 'price_above_reference'; material: string; price: number; reference: number }
  /** Paket V: the maker's own price for the order on this printer is above the order's budget (TRY) */
  | { code: 'price_above_budget'; price: number; budget: number }
  | { code: 'no_capacity'; neededMinutes: number; bestFreeMinutes: number; days: number }
  | { code: 'print_profile_missing' }

/**
 * Rules even an admin cannot override in manual mode: business rule 2 (nobody makes their own
 * order), makers who could not act on an offer at all, makers who are not approved (a rejected
 * maker is stored as not approved), makers abroad (cross-border production is off, K-K), and an
 * RFQ order that was awarded to someone else at their bid price.
 */
const HARD_BLOCKERS = new Set([
  'is_buyer',
  'is_seller',
  'suspended',
  'no_printer',
  'not_approved',
  'other_country',
  'rfq_awarded_elsewhere',
])

export function isHardBlocker(reason: Reason): boolean {
  return HARD_BLOCKERS.has(reason.code)
}

export interface PrinterVerdict {
  printerId: string
  name: string
  reasons: Reason[]
}

export interface MakerVerdict {
  manufacturerProfileId: string
  alias: string
  name: string | null
  city: string | null
  trustTier: number
  /** Rules that rule the whole maker out, whatever their printers can do. */
  reasons: Reason[]
  /** Every active printer and what it is missing (empty list = that printer fits). */
  printers: PrinterVerdict[]
  eligible: boolean
  /** Fails a rule no admin override can lift (see `isHardBlocker`). */
  blocked: boolean
}

interface ExplainOptions {
  offeredStatuses?: Map<string, string>
  now?: DateTime
  /** V5: the buyer's city, for the makers' distance surcharge (as the matcher gets it) */
  buyerCity?: string | null
}

/**
 * Reports, for every maker profile, which eligibility rules pass and which do not. It reads the
 * same data and uses the same helpers as `EligibilityService`; a spec keeps the two in step
 * (`eligible` here ⇔ a candidate there). Admin only.
 */
export default class EligibilityExplainer {
  async explain(order: Order, options: ExplainOptions = {}): Promise<MakerVerdict[]> {
    await order.load('items', (q) => q.preload('modelFile'))
    const items = order.items
    const technology = items[0]?.technology
    const requiredMinutes = items.reduce((sum, i) => sum + i.estPrintMinutes, 0)
    const now = options.now ?? DateTime.now()
    const from = now.toISODate()!
    const days = await productionDaysForOrder({ id: order.id, channel: order.channel, items })
    const to = now.plus({ days }).toISODate()!
    const offered = options.offeredStatuses ?? new Map<string, string>()
    // the same split as the matcher: market-priced orders check the maker's floor against the
    // budget, older orders the price per gram, RFQ orders nothing (the bid is the price)
    const budget = order.channel === 'rfq' ? null : order.makerBudgetMinor
    const checkPrice = order.channel !== 'rfq' && budget === null
    const lines = budget === null ? [] : orderWorkLines({ fxRateNano: order.fxRateNano, items })
    const references = await orderReferences(
      order,
      items.map((i) => i.material)
    )

    const profiles = await ManufacturerProfile.query()
      .preload('user')
      .preload('printers', (p) =>
        p
          .where('isActive', true)
          .preload('materials')
          .preload('capacitySlots', (q) => q.where('date', '>=', from).where('date', '<=', to))
          .orderBy('id', 'asc')
      )
      .orderBy('id', 'asc')

    const awardedTo = order.channel === 'rfq' ? await this.rfqAwardee(order.id) : null
    const costs =
      budget === null ? new Map<string, MakerCosts>() : await costsOf(profiles.map((p) => p.id))
    const printerProfiles = await this.printerProfiles(profiles.flatMap((p) => p.printers))
    const finishings = await this.finishings(profiles.map((p) => p.id))
    const printerCounts = await this.printerCounts(profiles.map((p) => p.id))
    const wantedProfiles = [
      ...new Set(items.map((i) => i.printProfileId).filter((id) => id !== null)),
    ]
    const wantedFinishings = [
      ...new Set(items.map((i) => i.finishingCode).filter((c) => c !== null)),
    ]

    return profiles.map((profile) => {
      const reasons: Reason[] = []
      if (profile.status !== 'active')
        reasons.push({ code: 'not_approved', status: profile.status })
      if (profile.user.suspendedAt) reasons.push({ code: 'suspended' })
      if (profile.userId === order.buyerId) reasons.push({ code: 'is_buyer' })
      if (order.sellerId && profile.userId === order.sellerId) reasons.push({ code: 'is_seller' })
      if (profile.trustTier < order.requiredTrustTier) {
        reasons.push({
          code: 'tier_too_low',
          have: profile.trustTier,
          need: order.requiredTrustTier,
        })
      }
      if (profile.country !== order.shipCountry) {
        reasons.push({ code: 'other_country', country: profile.country, need: order.shipCountry })
      }
      const offeredStatus = offered.get(profile.id)
      if (offeredStatus) reasons.push({ code: 'already_offered', status: offeredStatus })
      if (awardedTo !== null && awardedTo !== profile.id) {
        reasons.push({ code: 'rfq_awarded_elsewhere' })
      }
      if (profile.printers.length === 0) {
        reasons.push({
          code: printerCounts.get(profile.id) ? 'no_active_printer' : 'no_printer',
        })
      }
      const missingFinishings = wantedFinishings.filter(
        (code) => !finishings.get(profile.id)?.has(code as string)
      ) as string[]
      if (missingFinishings.length > 0) {
        reasons.push({ code: 'finishing_missing', missing: missingFinishings })
      }

      const printers = profile.printers.map((printer) => ({
        printerId: printer.id,
        name: printer.name,
        reasons: this.printerReasons(printer, items, {
          technology,
          requiredMinutes,
          checkPrice,
          wantedProfiles: wantedProfiles as string[],
          offeredProfiles: printerProfiles.get(printer.id),
          days,
          references,
          budget,
          lines,
          costs: costs.get(profile.id),
          where: {
            maker: { city: profile.city, country: profile.country },
            delivery: { city: options.buyerCity ?? null, country: order.shipCountry },
          },
        }),
      }))

      const mixedTechnologies = items.some((i) => i.technology !== technology)
      return {
        manufacturerProfileId: profile.id,
        alias: profile.publicAlias,
        name: profile.user.fullName,
        city: profile.city,
        trustTier: profile.trustTier,
        reasons,
        printers,
        eligible:
          items.length > 0 &&
          !mixedTechnologies &&
          reasons.length === 0 &&
          printers.some((p) => p.reasons.length === 0),
        blocked: reasons.some(isHardBlocker),
      }
    })
  }

  private printerReasons(
    printer: Printer,
    items: OrderItem[],
    ctx: {
      technology: string | undefined
      requiredMinutes: number
      checkPrice: boolean
      wantedProfiles: string[]
      offeredProfiles: Set<string> | undefined
      days: number
      references: Map<string, number | null>
      budget: number | null
      lines: WorkLine[]
      costs: MakerCosts | undefined
      where: Parameters<typeof printerFloor>[3]
    }
  ): Reason[] {
    const reasons: Reason[] = []
    if (printer.technology !== ctx.technology) {
      reasons.push({
        code: 'wrong_technology',
        have: printer.technology,
        need: ctx.technology ?? '—',
      })
    }

    const free = printer.capacitySlots.map((s) => s.maxMinutes - s.reservedMinutes)
    if (!free.some((m) => m >= ctx.requiredMinutes)) {
      reasons.push({
        code: 'no_capacity',
        neededMinutes: ctx.requiredMinutes,
        bestFreeMinutes: Math.max(0, ...free),
        days: ctx.days,
      })
    }

    const build = [printer.buildVolumeXMm, printer.buildVolumeYMm, printer.buildVolumeZMm]
    for (const item of items) {
      const f = item.modelFile
      const part = [f.bboxXMm, f.bboxYMm, f.bboxZMm]
      if (part.some((d) => d === null)) {
        reasons.push({ code: 'size_unknown' })
      } else {
        const scaled = (part as number[]).map((d) => (d * (item.scalePercent ?? 100)) / 100)
        if (
          !fitsBuildVolume(scaled as [number, number, number], build as [number, number, number])
        ) {
          reasons.push({ code: 'too_small', build, part: scaled.map((d) => Math.round(d)) })
        }
      }
      reasons.push(...this.materialReasons(printer, item, ctx.checkPrice, ctx.references))
    }

    if (!ctx.wantedProfiles.every((id) => ctx.offeredProfiles?.has(id))) {
      reasons.push({ code: 'print_profile_missing' })
    }
    if (ctx.budget !== null && ctx.costs) {
      const floor = printerFloor(printer, ctx.costs, ctx.lines, ctx.where)
      if (floor !== null && floor > ctx.budget) {
        reasons.push({ code: 'price_above_budget', price: floor, budget: ctx.budget })
      }
    }
    return reasons
  }

  /** Same test as `supportsItem`, split so the admin sees which part failed. */
  private materialReasons(
    printer: Printer,
    item: OrderItem,
    checkPrice: boolean,
    references: Map<string, number | null>
  ): Reason[] {
    const material = item.material.toUpperCase()
    const same = printer.materials.filter((m) => m.material.toUpperCase() === material)
    if (same.length === 0) return [{ code: 'material_missing', material }]

    const reference = references.get(material) ?? null
    if (
      checkPrice &&
      !same.some((m) => makerPriceFits(m.materialCostPerKgMinor, item.material, reference))
    ) {
      return [
        {
          code: 'price_above_reference',
          material,
          // both per kilogram, like the maker types it
          price: Math.min(...same.map((m) => m.materialCostPerKgMinor)),
          reference: (reference ?? referencePriceFor(item.material)?.pricePerGramMinor ?? 0) * 1000,
        },
      ]
    }
    return []
  }

  private async rfqAwardee(orderId: string): Promise<string | null> {
    const awarded = await db
      .from('rfqs')
      .join('rfq_bids', 'rfq_bids.id', 'rfqs.awarded_bid_id')
      .where('rfqs.order_id', orderId)
      .select('rfq_bids.manufacturer_profile_id as maker')
      .first()
    // no awarded bid → nobody is eligible; an empty id matches no profile
    return awarded ? awarded.maker : ''
  }

  private async printerProfiles(printers: Printer[]) {
    const map = new Map<string, Set<string>>()
    if (printers.length === 0) return map
    const rows = await db.from('printer_print_profiles').whereIn(
      'printer_id',
      printers.map((p) => p.id)
    )
    for (const row of rows) {
      const set = map.get(row.printer_id) ?? new Set<string>()
      set.add(row.print_profile_id)
      map.set(row.printer_id, set)
    }
    return map
  }

  private async printerCounts(profileIds: string[]) {
    const map = new Map<string, number>()
    if (profileIds.length === 0) return map
    const rows = await db
      .from('printers')
      .whereIn('manufacturer_profile_id', profileIds)
      .groupBy('manufacturer_profile_id')
      .select('manufacturer_profile_id')
      .count('* as n')
    for (const row of rows) map.set(row.manufacturer_profile_id, Number(row.n))
    return map
  }

  private async finishings(profileIds: string[]) {
    const map = new Map<string, Set<string>>()
    if (profileIds.length === 0) return map
    const rows = await db
      .from('manufacturer_finishings as mf')
      .join('finishing_options as fo', 'fo.id', 'mf.finishing_option_id')
      .whereIn('mf.manufacturer_profile_id', profileIds)
      .select('mf.manufacturer_profile_id', 'fo.code')
    for (const row of rows) {
      const set = map.get(row.manufacturer_profile_id) ?? new Set<string>()
      set.add(row.code)
      map.set(row.manufacturer_profile_id, set)
    }
    return map
  }
}
