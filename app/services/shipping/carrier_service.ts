import { randomBytes } from 'node:crypto'
import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import ManufacturerProfile from '#models/manufacturer_profile'
import ProductionJob from '#models/production_job'
import FulfillmentService from '#services/orders/fulfillment_service'
import OrderService from '#services/orders/order_service'
import type { CarrierProvider, Label } from '#services/shipping/carrier_provider'
import FakeCarrier from '#services/shipping/fake_carrier'
import env from '#start/env'

export type CarrierOutcome = 'delivered' | 'in_transit' | 'ignored' | 'duplicate' | 'unknown_parcel'

/**
 * Until a real carrier is chosen (decision D3) the fake one stands in, never in production. Its
 * webhook secret comes from FAKE_CARRIER_SECRET; without it a staging or dev server makes up a
 * random one per process, so nobody can forge a "delivered" event with a known constant. Only
 * tests keep the fixed default they sign with.
 */
function defaultCarrier(): CarrierProvider {
  if (app.inProduction && !env.get('STAGING', false)) {
    throw new Error('No carrier integration is configured for production (decision D3)')
  }
  const secret = env.get('FAKE_CARRIER_SECRET')?.release()
  if (secret) return new FakeCarrier(secret)
  return app.inTest ? new FakeCarrier() : new FakeCarrier(randomBytes(32).toString('hex'))
}

export default class CarrierService {
  private provider: CarrierProvider

  constructor(provider: CarrierProvider | null = null) {
    this.provider = provider ?? defaultCarrier()
  }

  /** Buys a label for a produced job. The sender line carries the maker's alias only. */
  async createLabel(jobId: string, weightGrams: number): Promise<Label> {
    const job = await ProductionJob.query().where('id', jobId).preload('order').firstOrFail()
    const profile = await ManufacturerProfile.findOrFail(job.manufacturerProfileId)
    const address = new OrderService().decryptShippingAddress(job.order)
    if (!address) throw new Error('This order has no delivery address')
    return this.provider.createLabel({
      orderCode: job.order.code,
      senderLabel: `Fabrmatch Fulfillment / ${profile.publicAlias}`,
      toName: address.fullName,
      toLine1: address.line1,
      toCity: address.city,
      toPostalCode: address.postalCode,
      toCountry: address.country,
      weightGrams,
    })
  }

  /**
   * Tracking webhook: "delivered" moves a shipped order to delivered (and starts the dispute
   * window) without waiting for the buyer or the 14-day fallback. Safe to redeliver.
   */
  async handleWebhook(
    rawBody: string,
    headers: Record<string, string | undefined>
  ): Promise<CarrierOutcome> {
    const event = await this.provider.handleWebhook(rawBody, headers)

    const inserted = await db
      .table('carrier_events')
      .insert({
        provider: this.provider.name,
        event_id: event.eventId,
        tracking_number: event.trackingNumber,
        status: event.status,
        received_at: new Date(),
      })
      .onConflict(['provider', 'event_id'])
      .ignore()
      .returning('id')
    if (inserted.length === 0) return 'duplicate'

    const job = await ProductionJob.query()
      .where('trackingNumber', event.trackingNumber)
      .whereNot('status', 'cancelled')
      .first()
    if (!job) return 'unknown_parcel'
    await db
      .from('carrier_events')
      .where('provider', this.provider.name)
      .where('event_id', event.eventId)
      .update({ processed_at: new Date() })

    if (event.status !== 'delivered')
      return event.status === 'in_transit' ? 'in_transit' : 'ignored'
    try {
      await new FulfillmentService().markDelivered(job.orderId, null, {
        by: 'carrier',
        trackingNumber: event.trackingNumber,
      })
      return 'delivered'
    } catch (error) {
      // already delivered / disputed / cancelled: nothing to do, the state machine said no
      logger.info({
        msg: 'carrier delivery ignored',
        orderId: job.orderId,
        error: (error as Error).message,
      })
      return 'ignored'
    }
  }
}
