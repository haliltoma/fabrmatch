import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import fabrmatchConfig from '#config/fabrmatch'
import ExternalListing from '#models/external_listing'
import ModelFile from '#models/model_file'
import SellerProduct from '#models/seller_product'
import StoreConnection from '#models/store_connection'
import User from '#models/user'
import NotificationService from '#services/notifications/notification_service'
import { BASE_CURRENCY, convertMinor } from '#services/pricing/fx'
import FxService from '#services/pricing/fx_service'
import { marketsFor, type Markets } from '#services/pricing/maker_market'
import ShippingService from '#services/shipping/shipping_service'
import type ShippingTable from '#services/shipping/shipping_table'
import StoreService from '#services/integrations/stores/store_service'
import { unitPriceFor } from '#services/storefront/storefront_service'

export type PriceStatus = 'ok' | 'thin' | 'loss'

/** A TRY amount in the shop's currency: the mid rate plus the FX buffer, up to a whole unit. */
export function inShopCurrency(tryMinor: number, rateE9: bigint | null, bufferBps: number) {
  if (rateE9 === null) return tryMinor
  const buffered = Math.ceil((convertMinor(tryMinor, rateE9) * (10_000 + bufferBps)) / 10_000)
  return Math.ceil(buffered / 100) * 100
}

/**
 * How a shop price stands against what the order costs the seller: below cost is a loss; less
 * than half of the margin they set for the product is thin.
 */
export function priceStatus(
  priceMinor: number,
  costMinor: number,
  targetMinor: number
): PriceStatus {
  if (priceMinor < costMinor) return 'loss'
  if ((priceMinor - costMinor) * 2 < targetMinor - costMinor) return 'thin'
  return 'ok'
}

const WORSE: Record<PriceStatus, number> = { ok: 0, thin: 1, loss: 2 }

/**
 * Paket V (V6): keeps the prices in a seller's shop in step with what production costs (makers'
 * market, admin settings, exchange rate). In `watch` mode the seller is told when a price turns
 * thin or loss-making; in `auto` mode the shop gets the suggested price (cost + the seller's
 * margin) by itself, in the shop's currency.
 */
export default class StorePriceWatch {
  private notifications = new NotificationService()

  /** Every active shop; one shop failing does not stop the others. */
  async checkAll(): Promise<{ shops: number; changed: number }> {
    const connections = await StoreConnection.query().where('status', 'active')
    let changed = 0
    for (const connection of connections) {
      try {
        const result = await this.check(connection)
        changed += result.changed
      } catch (error) {
        logger.warn({ msg: 'shop price check failed', connectionId: connection.id, error })
      }
    }
    return { shops: connections.length, changed }
  }

  async check(connection: StoreConnection): Promise<{ checked: number; changed: number }> {
    const listings = await ExternalListing.query()
      .where('storeConnectionId', connection.id)
      .where('published', true)
      .whereNotNull('sellerProductId')
      .whereNotNull('material')
      .whereNotNull('priceMinor')
    if (listings.length === 0) return { checked: 0, changed: 0 }

    const products = await SellerProduct.query()
      .whereIn('id', [...new Set(listings.map((l) => l.sellerProductId!))])
      .preload('catalogProduct')
    const productOf = new Map(products.map((p) => [p.id, p]))
    const files = await ModelFile.query().whereIn(
      'id',
      products.map((p) => p.catalogProduct?.modelFileId).filter((id): id is string => !!id)
    )
    const fileOf = new Map(files.map((f) => [f.id, f]))
    const shipping = await new ShippingService().table()
    const markets = await marketsFor(
      'TR',
      listings.map((l) => l.material!)
    )
    const currency = (connection.currency ?? BASE_CURRENCY).toUpperCase()
    const rate = currency === BASE_CURRENCY ? null : await this.midRate(currency)
    if (currency !== BASE_CURRENCY && rate === null) {
      // no rate for the shop's currency: nothing safe to compare against
      return { checked: 0, changed: 0 }
    }
    const buffer = fabrmatchConfig.pricing.fxMarginBps

    let changed = 0
    const toRepublish = new Map<string, Array<{ material: string; priceMinor: number }>>()
    for (const listing of listings) {
      const product = productOf.get(listing.sellerProductId!)
      const file = fileOf.get(product?.catalogProduct?.modelFileId ?? '')
      if (!product || !file) continue
      const prices = this.pricesFor(product, file, listing, shipping, markets)
      if (!prices) continue
      const cost = inShopCurrency(prices.costMinor, rate, buffer)
      const target = inShopCurrency(prices.suggestedMinor, rate, buffer)
      const status = priceStatus(listing.priceMinor!, cost, target)
      const before = (listing.priceStatus as PriceStatus | null) ?? 'ok'

      listing.costMinor = cost
      listing.priceStatus = status
      listing.priceCheckedAt = DateTime.now()
      await listing.save()

      if (status !== 'ok' && connection.priceMode === 'auto') {
        const variants = toRepublish.get(product.id) ?? []
        variants.push({ material: listing.material!, priceMinor: target })
        toRepublish.set(product.id, variants)
      } else if (WORSE[status] > WORSE[before]) {
        changed++
        await this.notifications.notify({
          userId: connection.sellerUserId,
          type: 'store_order',
          role: 'seller',
          context: {
            storeStep: status === 'loss' ? 'price_loss' : 'price_thin',
            shopOrder: connection.shopName,
            productTitle: `${product.title} (${listing.material})`,
            amountMinor: target,
            currency,
          },
          eventKey: `store-price:${listing.id}:${status}:${DateTime.now().toISODate()}`,
        })
      }
    }

    if (toRepublish.size > 0) changed += await this.republish(connection, toRepublish)
    return { checked: listings.length, changed }
  }

  /** What a piece costs the seller (TRY, no margin) and the price with their margin. */
  private pricesFor(
    product: SellerProduct,
    file: ModelFile,
    listing: ExternalListing,
    shipping: ShippingTable,
    markets: Markets
  ) {
    const material = listing.material!.toUpperCase()
    const scale = listing.scalePercent ?? 100
    const atCost = Object.create(product, { marginBps: { value: 0 } }) as SellerProduct
    const costMinor = unitPriceFor(atCost, file, material, shipping, scale, 0, undefined, markets)
    const suggestedMinor = unitPriceFor(
      product,
      file,
      material,
      shipping,
      scale,
      0,
      undefined,
      markets
    )
    return costMinor === null || suggestedMinor === null ? null : { costMinor, suggestedMinor }
  }

  /** auto mode: the shop gets the suggested prices; the other variants keep theirs. */
  private async republish(
    connection: StoreConnection,
    changes: Map<string, Array<{ material: string; priceMinor: number }>>
  ): Promise<number> {
    const seller = await User.findOrFail(connection.sellerUserId)
    const stores = new StoreService()
    let updated = 0
    for (const [productId, variants] of changes) {
      const current = await ExternalListing.query()
        .where('storeConnectionId', connection.id)
        .where('sellerProductId', productId)
        .where('published', true)
      const newPrice = new Map(variants.map((v) => [v.material.toUpperCase(), v.priceMinor]))
      const all = current
        .filter((l) => l.material && l.priceMinor !== null)
        .map((l) => ({
          material: l.material!.toUpperCase(),
          priceMinor: newPrice.get(l.material!.toUpperCase()) ?? l.priceMinor!,
        }))
      try {
        await stores.publish(seller, connection.id, productId, all)
        await ExternalListing.query()
          .where('storeConnectionId', connection.id)
          .where('sellerProductId', productId)
          .whereIn('material', [...newPrice.keys()])
          .update({ priceStatus: 'ok' })
        updated += variants.length
        await this.notifications.notify({
          userId: connection.sellerUserId,
          type: 'store_order',
          role: 'seller',
          context: {
            storeStep: 'price_updated',
            shopOrder: connection.shopName,
            productTitle: current[0]?.title ?? null,
          },
          eventKey: `store-price-updated:${productId}:${DateTime.now().toISO()}`,
        })
      } catch (error) {
        logger.warn({ msg: 'shop price update failed', productId, error })
      }
    }
    return updated
  }

  /**
   * V6: shop orders that no maker has taken after the admin's notice time. The seller hears it
   * once per order, so they can answer their customer before the customer asks the shop.
   */
  async noticeWaitingOrders(): Promise<number> {
    const cutoff = DateTime.now()
      .minus({ hours: fabrmatchConfig.orders.shopWaitingNoticeHours })
      .toSQL()!
    const waiting = await db
      .from('external_orders as eo')
      .join('orders as o', 'o.id', 'eo.order_id')
      .join('store_connections as sc', 'sc.id', 'eo.store_connection_id')
      .whereIn('o.status', ['paid', 'matching', 'unmatched'])
      .where('o.created_at', '<=', cutoff)
      .select(
        'o.id as order_id',
        'o.code',
        'sc.seller_user_id',
        'sc.shop_name',
        'eo.external_order_name',
        'eo.external_order_id'
      )
    for (const row of waiting) {
      await this.notifications.notify({
        userId: row.seller_user_id,
        type: 'store_order',
        role: 'seller',
        context: {
          storeStep: 'waiting_for_maker',
          shopOrder: row.shop_name,
          code: row.code,
          orderId: row.order_id,
        },
        eventKey: `store-waiting:${row.order_id}`,
      })
    }
    return waiting.length
  }

  /** The newest mid rate for a currency (foreign per 1 TRY, ×1e9), at most a week old. */
  private async midRate(currency: string): Promise<bigint | null> {
    const rates = await new FxService().displayRates()
    return rates[currency] ? BigInt(rates[currency]) : null
  }
}
