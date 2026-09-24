import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { referencePriceFor } from '#services/pricing/reference_prices'

const LOOKBACK_DAYS = 30

/**
 * "You asked more than the platform pays": for each material a maker offers above the reference
 * price, how many recent orders of that material and technology they could not be matched to.
 */
export default class MissedOrdersService {
  async forPrinters(
    printers: Array<{
      id: number
      technology: string
      materials: Array<{ id: number; material: string; pricePerGramMinor: number }>
    }>
  ): Promise<Map<number, { missedOrders: number; referencePricePerGramMinor: number }>> {
    const result = new Map<number, { missedOrders: number; referencePricePerGramMinor: number }>()
    const since = DateTime.now().minus({ days: LOOKBACK_DAYS }).toSQL()!

    for (const printer of printers) {
      for (const m of printer.materials) {
        const reference = referencePriceFor(m.material)
        if (!reference || m.pricePerGramMinor <= reference.pricePerGramMinor) continue
        const row = await db
          .from('order_items as oi')
          .join('orders as o', 'o.id', 'oi.order_id')
          .where('oi.material', m.material.toUpperCase())
          .where('oi.technology', printer.technology)
          .whereNotIn('o.status', ['draft', 'awaiting_payment', 'cancelled'])
          .where('o.created_at', '>=', since)
          .countDistinct('o.id as n')
          .first()
        result.set(m.id, {
          missedOrders: Number(row?.n ?? 0),
          referencePricePerGramMinor: reference.pricePerGramMinor,
        })
      }
    }
    return result
  }
}
