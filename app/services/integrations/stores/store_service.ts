import { randomBytes } from 'node:crypto'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import DomainError from '#exceptions/domain_error'
import AuditLog from '#models/audit_log'
import ExternalListing from '#models/external_listing'
import ExternalOrder from '#models/external_order'
import ProductionJob from '#models/production_job'
import SellerProduct from '#models/seller_product'
import StoreConnection from '#models/store_connection'
import User from '#models/user'
import EncryptionService from '#services/identity/encryption_service'
import OrderService, { type ShippingAddress } from '#services/orders/order_service'
import { storeAdapter } from '#services/integrations/stores/store_registry'
import type { IncomingOrder } from '#services/integrations/stores/store_adapter'

export class StoreError extends DomainError {}

/** After this many failed write-backs the order waits for someone to look at it. */
export const MAX_FULFILLMENT_ATTEMPTS = 10

export interface ListingMapping {
  sellerProductId: number | null
  material: string | null
  color: string | null
  scalePercent: number | null
}

/**
 * The seller's external shops (R4 core): which variant is which product (R4-T3), orders coming
 * in once per external id, and tracking written back when the parcel ships (R4-T4).
 * Until K-E decides how a seller pays (wallet/saved card), each imported order waits for the
 * seller to pay its production cost like any other order.
 */
export default class StoreService {
  private encryption = new EncryptionService()

  async connections(seller: User) {
    return StoreConnection.query()
      .where('sellerUserId', seller.id)
      .where('status', 'active')
      .orderBy('id', 'asc')
  }

  private async ownConnection(seller: User, connectionId: number) {
    const connection = await StoreConnection.query()
      .where('id', connectionId)
      .where('sellerUserId', seller.id)
      .where('status', 'active')
      .first()
    if (!connection) throw new StoreError('Shop not found', { status: 404 })
    return connection
  }

  /** Local development and tests: a pretend shop that behaves like Shopify. */
  async connectTestShop(seller: User) {
    storeAdapter('fake') // refuses outside dev/test
    const connection = await StoreConnection.create({
      sellerUserId: seller.id,
      provider: 'fake',
      shopName: 'Test shop',
      externalShopId: `test-${randomBytes(6).toString('hex')}`,
      webhookSecretEnc: this.encryption.encrypt(randomBytes(24).toString('hex')),
      status: 'active',
    })
    await this.syncListings(seller, connection.id)
    return connection
  }

  async disconnect(seller: User, connectionId: number) {
    const connection = await this.ownConnection(seller, connectionId)
    connection.status = 'disconnected'
    connection.accessTokenEnc = null
    await connection.save()
    await AuditLog.create({
      actorId: seller.id,
      action: 'store.disconnected',
      subjectType: 'store_connection',
      subjectId: connection.id,
      meta: { provider: connection.provider },
    })
  }

  /** Pulls the shop's variants; mappings the seller already made are kept. */
  async syncListings(seller: User, connectionId: number) {
    const connection = await this.ownConnection(seller, connectionId)
    const variants = await storeAdapter(connection.provider).listVariants(connection)
    for (const variant of variants) {
      await db
        .table('external_listings')
        .insert({
          store_connection_id: connection.id,
          external_product_id: variant.productId,
          external_variant_id: variant.variantId,
          sku: variant.sku,
          title: variant.title.slice(0, 300),
          created_at: new Date(),
          updated_at: new Date(),
        })
        .onConflict(['store_connection_id', 'external_variant_id'])
        .merge(['external_product_id', 'sku', 'title', 'updated_at'])
    }
    connection.lastSyncedAt = DateTime.now()
    await connection.save()
    return variants.length
  }

  async listings(seller: User, connectionId: number) {
    const connection = await this.ownConnection(seller, connectionId)
    return ExternalListing.query().where('storeConnectionId', connection.id).orderBy('title', 'asc')
  }

  /** R4-T3: this variant is this product, printed in this material / colour / size. */
  async mapListing(seller: User, listingId: number, mapping: ListingMapping) {
    const listing = await ExternalListing.findOrFail(listingId)
    const connection = await this.ownConnection(seller, listing.storeConnectionId)

    if (mapping.sellerProductId === null) {
      listing.merge({ sellerProductId: null, material: null, color: null, scalePercent: null })
      await listing.save()
      return listing
    }
    const product = await SellerProduct.query()
      .where('id', mapping.sellerProductId)
      .whereHas('sellerProfile', (q) => q.where('userId', seller.id))
      .preload('catalogProduct')
      .first()
    if (!product) throw new StoreError('Choose one of your own products')
    const catalog = product.catalogProduct
    const material = mapping.material?.toUpperCase() ?? null
    if (!material || !catalog?.allowedMaterials.map((m) => m.toUpperCase()).includes(material)) {
      throw new StoreError('Choose a material this product can be printed in')
    }
    const scale = mapping.scalePercent ?? 100
    if (!(catalog.allowedScales ?? [100]).includes(scale)) {
      throw new StoreError('That size is not offered for this product')
    }
    listing.merge({
      sellerProductId: product.id,
      material,
      color: mapping.color?.trim() || null,
      scalePercent: scale,
    })
    await listing.save()
    await AuditLog.create({
      actorId: seller.id,
      action: 'store.listing_mapped',
      subjectType: 'external_listing',
      subjectId: listing.id,
      meta: { sellerProductId: product.id, material, scale },
    })

    // orders that were waiting for this mapping go through now
    const waiting = await ExternalOrder.query()
      .where('storeConnectionId', connection.id)
      .where('status', 'needs_mapping')
    for (const order of waiting) await this.place(order, connection)
    return listing
  }

  /** Webhook entry: verify, store once per external id, and place it if every line is mapped. */
  async receiveOrderWebhook(
    connectionId: number,
    rawBody: string,
    headers: Record<string, string | undefined>
  ) {
    const connection = await StoreConnection.query()
      .where('id', connectionId)
      .where('status', 'active')
      .first()
    if (!connection) throw new StoreError('Shop not found', { status: 404 })
    const incoming = await storeAdapter(connection.provider).parseOrderWebhook(
      connection,
      rawBody,
      headers
    )
    return this.importOrder(connection, incoming)
  }

  async importOrder(connection: StoreConnection, incoming: IncomingOrder) {
    const lines = incoming.lines
      .filter((l) => Number.isInteger(l.quantity) && l.quantity > 0)
      .map((l) => ({
        variantId: String(l.variantId),
        sku: l.sku ?? null,
        title: String(l.title ?? '').slice(0, 300),
        quantity: l.quantity,
      }))
    const inserted = await db
      .table('external_orders')
      .insert({
        store_connection_id: connection.id,
        external_order_id: String(incoming.externalOrderId),
        external_order_name: incoming.name?.slice(0, 100) ?? null,
        status: 'needs_mapping',
        lines: JSON.stringify(lines),
        shipping_address_enc: this.encryption.encrypt(JSON.stringify(incoming.shippingAddress)),
        created_at: new Date(),
        updated_at: new Date(),
      })
      .onConflict(['store_connection_id', 'external_order_id'])
      .ignore()
      .returning('id')
    if (inserted.length === 0) {
      return { duplicate: true as const }
    }
    const order = await ExternalOrder.findOrFail(inserted[0].id)
    await this.place(order, connection)
    return { duplicate: false as const, externalOrder: await order.refresh() }
  }

  /** Every line mapped → a Fabrmatch order for the seller to pay; otherwise it waits. */
  private async place(order: ExternalOrder, connection: StoreConnection) {
    if (order.orderId) return
    const listings = await ExternalListing.query()
      .where('storeConnectionId', connection.id)
      .whereIn(
        'externalVariantId',
        order.lines.map((l) => l.variantId)
      )
    const byVariant = new Map(listings.map((l) => [l.externalVariantId, l]))
    const unmapped = order.lines.filter((l) => !byVariant.get(l.variantId)?.sellerProductId)
    if (order.lines.length === 0) {
      order.merge({ status: 'ignored', error: 'The order has no printable lines' })
      await order.save()
      return
    }
    if (unmapped.length > 0) {
      order.merge({
        status: 'needs_mapping',
        error: `Not mapped yet: ${unmapped.map((l) => l.sku ?? l.title).join(', ')}`.slice(0, 500),
      })
      await order.save()
      return
    }

    const seller = await User.findOrFail(connection.sellerUserId)
    const address = JSON.parse(this.encryption.decrypt(order.shippingAddressEnc)) as ShippingAddress
    try {
      const created = await new OrderService().createExternalDraft(
        seller,
        order.lines.map((l) => {
          const listing = byVariant.get(l.variantId)!
          return {
            sellerProductId: listing.sellerProductId!,
            material: listing.material!,
            color: listing.color,
            scalePercent: listing.scalePercent,
            quantity: l.quantity,
          }
        }),
        address,
        storeAdapter(connection.provider).channel
      )
      order.merge({ orderId: created.id, status: 'placed', error: null })
      await order.save()
    } catch (error) {
      order.merge({ status: 'failed', error: (error as Error).message.slice(0, 500) })
      await order.save()
      logger.warn({ msg: 'external order could not be placed', id: order.id, error })
    }
  }

  async orders(seller: User, connectionId: number) {
    const connection = await this.ownConnection(seller, connectionId)
    return ExternalOrder.query()
      .where('storeConnectionId', connection.id)
      .preload('order')
      .orderBy('id', 'desc')
      .limit(100)
  }

  /** R4-T4: the order shipped — queue the tracking for the shop. */
  async orderShipped(orderId: number) {
    await ExternalOrder.query()
      .where('orderId', orderId)
      .where('fulfillmentStatus', 'none')
      .update({ fulfillment_status: 'pending', updated_at: new Date() })
  }

  /** Sweep: writes tracking back to the shops, retrying failures a bounded number of times. */
  async pushPendingFulfillments(): Promise<{ pushed: number; failed: number }> {
    const pending = await ExternalOrder.query()
      .where('fulfillmentStatus', 'pending')
      .preload('storeConnection')
      .orderBy('id', 'asc')
      .limit(100)
    let pushed = 0
    let failed = 0
    for (const order of pending) {
      const job = await ProductionJob.query()
        .where('orderId', order.orderId!)
        .whereNotNull('trackingNumber')
        .orderBy('id', 'desc')
        .first()
      if (!job?.trackingNumber || !job.carrier) continue
      try {
        if (order.storeConnection.status !== 'active') throw new Error('Shop disconnected')
        await storeAdapter(order.storeConnection.provider).pushFulfillment(
          order.storeConnection,
          order.externalOrderId,
          { carrier: job.carrier, trackingNumber: job.trackingNumber }
        )
        order.merge({
          fulfillmentStatus: 'pushed',
          fulfillmentPushedAt: DateTime.now(),
          fulfillmentError: null,
        })
        pushed++
      } catch (error) {
        const attempts = order.fulfillmentAttempts + 1
        order.merge({
          fulfillmentAttempts: attempts,
          fulfillmentError: (error as Error).message.slice(0, 500),
          fulfillmentStatus: attempts >= MAX_FULFILLMENT_ATTEMPTS ? 'failed' : 'pending',
        })
        failed++
      }
      await order.save()
    }
    return { pushed, failed }
  }

  /** Seller can retry a write-back that gave up. */
  async retryFulfillment(seller: User, externalOrderId: number) {
    const order = await ExternalOrder.findOrFail(externalOrderId)
    await this.ownConnection(seller, order.storeConnectionId)
    if (order.fulfillmentStatus !== 'failed') throw new StoreError('Nothing to retry')
    order.merge({ fulfillmentStatus: 'pending', fulfillmentAttempts: 0 })
    await order.save()
  }
}
