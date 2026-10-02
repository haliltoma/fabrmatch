import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import PricingRegionService from '#services/pricing/pricing_region_service'

const LOOKBACK_DAYS = 30

/**
 * "You asked more than the platform pays": for each material a maker offers above the reference
 * price of their own region (P2), how many recent orders of that material and technology,
 * delivered in their country (the only ones they can be matched to), they could not take.
 */
export default class MissedOrdersService {
  async forPrinters(
    printers: Array<{
      id: string
      technology: string
      materials: Array<{ id: string; material: string; materialCostPerKgMinor: number }>
    }>,
    country = 'TR'
  ): Promise<Map<string, { missedOrders: number; referenceCostPerKgMinor: number }>> {
    const result = new Map<string, { missedOrders: number; referenceCostPerKgMinor: number }>()
    const since = DateTime.now().minus({ days: LOOKBACK_DAYS }).toSQL()!
    const code = country.trim().toUpperCase()
    const regions = new PricingRegionService()
    const region = await regions.forCountry(code)

    for (const printer of printers) {
      for (const m of printer.materials) {
        const reference = regions.referenceFor(region, m.material)
        if (reference === null || m.materialCostPerKgMinor <= reference * 1000) continue
        const row = await db
          .from('order_items as oi')
          .join('orders as o', 'o.id', 'oi.order_id')
          .where('oi.material', m.material.toUpperCase())
          .where('oi.technology', printer.technology)
          .where('o.ship_country', code)
          .whereNotIn('o.status', ['draft', 'awaiting_payment', 'cancelled'])
          .where('o.created_at', '>=', since)
          .countDistinct('o.id as n')
          .first()
        result.set(m.id, {
          missedOrders: Number(row?.n ?? 0),
          referenceCostPerKgMinor: reference * 1000,
        })
      }
    }
    return result
  }
}
