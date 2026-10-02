import { BaseTransformer } from '@adonisjs/core/transformers'
import type ExternalListing from '#models/external_listing'
import type ExternalOrder from '#models/external_order'
import type StoreConnection from '#models/store_connection'

/** A seller's own shop: never its token or webhook secret. */
export class StoreConnectionTransformer extends BaseTransformer<StoreConnection> {
  toObject() {
    const c = this.resource
    return {
      id: c.id,
      provider: c.provider,
      shopName: c.shopName,
      shopUrl: c.shopUrl,
      currency: c.currency,
      lastSyncedAt: c.lastSyncedAt?.toISO() ?? null,
      // V6: warn the seller about thin prices, or keep the shop's prices up to date
      priceMode: c.priceMode as 'watch' | 'auto',
    }
  }
}

export class ExternalListingTransformer extends BaseTransformer<ExternalListing> {
  toObject() {
    const l = this.resource
    return {
      id: l.id,
      title: l.title,
      sku: l.sku,
      sellerProductId: l.sellerProductId,
      material: l.material,
      color: l.color,
      scalePercent: l.scalePercent,
      published: l.published,
      priceMinor: l.priceMinor,
      // V6: what an order of it costs the seller in the shop's currency, at the last check
      costMinor: l.costMinor,
      priceStatus: l.priceStatus as 'ok' | 'thin' | 'loss' | null,
      priceCheckedAt: l.priceCheckedAt?.toISO() ?? null,
      externalProductId: l.externalProductId,
    }
  }
}

/** Orders from the shop, as the seller sees them: our order code and states, no maker. */
export class ExternalOrderTransformer extends BaseTransformer<ExternalOrder> {
  toObject() {
    const o = this.resource
    return {
      id: o.id,
      name: o.externalOrderName ?? o.externalOrderId,
      status: o.status,
      error: o.error,
      lines: o.lines.map((l) => ({ title: l.title, sku: l.sku, quantity: l.quantity })),
      order: o.order
        ? {
            id: o.order.id,
            code: o.order.code,
            status: o.order.status,
            totalMinor: o.order.totalMinor,
            currency: o.order.currency,
          }
        : null,
      fulfillmentStatus: o.fulfillmentStatus,
      fulfillmentError: o.fulfillmentError,
      createdAt: o.createdAt.toISO(),
    }
  }
}
