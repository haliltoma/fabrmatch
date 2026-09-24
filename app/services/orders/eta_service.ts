import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import fabrmatchConfig from '#config/fabrmatch'
import ShippingService from '#services/shipping/shipping_service'

export interface Eta {
  /** earliest and latest delivery date, ISO (yyyy-mm-dd) */
  earliest: string
  latest: string
}

/**
 * Delivery window = the first free capacity slot that fits the job (earliest a maker can start)
 * + production time inside the SLA + carrier transit for the destination zone.
 * No maker with room → null; the UI then says the date is confirmed after matching.
 */
export default class EtaService {
  async estimate(input: {
    technology: string
    printMinutes: number
    country: string
    now?: DateTime
  }): Promise<Eta | null> {
    const now = input.now ?? DateTime.now()
    const today = now.toISODate()!
    const slot = await db
      .from('capacity_slots as cs')
      .join('printers as p', 'p.id', 'cs.printer_id')
      .join('manufacturer_profiles as mp', 'mp.id', 'p.manufacturer_profile_id')
      .where('p.is_active', true)
      .where('p.technology', input.technology)
      .where('mp.status', 'active')
      .where('cs.date', '>', today)
      .whereRaw('cs.max_minutes - cs.reserved_minutes >= ?', [input.printMinutes])
      .min('cs.date as first')
      .first()
    if (!slot?.first) return null

    const start = DateTime.fromJSDate(new Date(slot.first)).startOf('day')
    const table = await new ShippingService().table()
    const zone = table.zoneFor(input.country)
    const productionDays = fabrmatchConfig.orders.productionSlaDays

    // best case: printed and shipped the day the slot opens; worst case: the whole SLA is used
    return {
      earliest: start.plus({ days: 1 + zone.transitDaysMin }).toISODate()!,
      latest: start.plus({ days: productionDays + zone.transitDaysMax }).toISODate()!,
    }
  }
}
