import DomainError from '#exceptions/domain_error'
import db from '@adonisjs/lucid/services/db'
import AuditLog from '#models/audit_log'
import ShippingTable, { type ShippingZoneData } from '#services/shipping/shipping_table'

export class ShippingError extends DomainError {}

export default class ShippingService {
  async table(): Promise<ShippingTable> {
    const zones = await db.from('shipping_zones').orderBy('id')
    const rates = await db.from('shipping_rates').orderBy('up_to_grams')
    const data: ShippingZoneData[] = zones.map((z) => ({
      code: z.code,
      countries: typeof z.countries === 'string' ? JSON.parse(z.countries) : z.countries,
      isFallback: z.is_fallback,
      extraPerKgMinor: z.extra_per_kg_minor,
      currency: z.currency,
      transitDaysMin: z.transit_days_min,
      transitDaysMax: z.transit_days_max,
      tiers: rates
        .filter((r) => r.zone_id === z.id)
        .map((r) => ({ upToGrams: r.up_to_grams, priceMinor: r.price_minor })),
    }))
    return new ShippingTable(data)
  }

  /** Admin view: zones with their editable rates. */
  async listForAdmin() {
    const zones = await db.from('shipping_zones').orderBy('id')
    const rates = await db.from('shipping_rates').orderBy('up_to_grams')
    return zones.map((z) => ({
      id: z.id as number,
      code: z.code as string,
      name: z.name as string,
      countries: (typeof z.countries === 'string'
        ? JSON.parse(z.countries)
        : z.countries) as string[],
      isFallback: z.is_fallback as boolean,
      extraPerKgMinor: z.extra_per_kg_minor as number,
      currency: z.currency as string,
      rates: rates
        .filter((r) => r.zone_id === z.id)
        .map((r) => ({
          id: r.id as number,
          upToGrams: r.up_to_grams as number,
          priceMinor: r.price_minor as number,
        })),
    }))
  }

  async setRate(rateId: number, priceMinor: number, adminId: number) {
    this.assertPrice(priceMinor)
    await this.audited(adminId, 'shipping.rate_changed', rateId, async () => {
      const row = await db.from('shipping_rates').where('id', rateId).first()
      if (!row) throw new ShippingError('Rate not found')
      await db
        .from('shipping_rates')
        .where('id', rateId)
        .update({ price_minor: priceMinor, updated_at: new Date() })
      return { from: row.price_minor, to: priceMinor, upToGrams: row.up_to_grams }
    })
  }

  async setExtraPerKg(zoneId: number, priceMinor: number, adminId: number) {
    this.assertPrice(priceMinor)
    await this.audited(adminId, 'shipping.extra_changed', zoneId, async () => {
      const row = await db.from('shipping_zones').where('id', zoneId).first()
      if (!row) throw new ShippingError('Zone not found')
      await db
        .from('shipping_zones')
        .where('id', zoneId)
        .update({ extra_per_kg_minor: priceMinor, updated_at: new Date() })
      return { from: row.extra_per_kg_minor, to: priceMinor, zone: row.code }
    })
  }

  private assertPrice(minor: number) {
    if (!Number.isSafeInteger(minor) || minor < 0) {
      throw new ShippingError('Price must be a whole number of minor units, zero or more')
    }
  }

  private async audited(
    adminId: number,
    action: string,
    subjectId: number,
    run: () => Promise<Record<string, unknown>>
  ) {
    const meta = await run()
    await AuditLog.create({ actorId: adminId, action, subjectType: 'shipping', subjectId, meta })
  }
}
