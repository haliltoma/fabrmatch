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
import OrderNotifier from '#services/notifications/order_notifier'
import PaymentService from '#services/payments/payment_service'
import SellerProfile from '#models/seller_profile'
import env from '#start/env'
import ProductImageService from '#services/catalog/product_image_service'
import { storeAdapter } from '#services/integrations/stores/store_registry'
import { fabrmatchSku, type IncomingOrder } from '#services/integrations/stores/store_adapter'
import { shopifyDomain } from '#services/integrations/stores/shopify_adapter'
import { wooSiteUrl } from '#services/integrations/stores/woocommerce_adapter'

export class StoreError extends DomainError {}

/** After this many failed write-backs the order waits for someone to look at it. */
export const MAX_FULFILLMENT_ATTEMPTS = 10

export interface ConnectInput {
  provider: 'shopify' | 'woocommerce'
  shopUrl: string
  /** Shopify client id / WooCommerce consumer key */
  apiKey: string | null
  /** Shopify client secret (also signs webhooks) / WooCommerce consumer secret */
  apiSecret: string
  /** Shopify only: an admin token from a legacy custom app, instead of the client id */
  accessToken?: string | null
}

export interface PublishVariant {
  material: string
  priceMinor: number
}

const SKU_PATTERN = /^FM-(\d+)-([A-Z0-9]+)$/

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
  private notifier = new OrderNotifier()

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

  /**
   * Printify-style connection with the seller's own credentials. The credentials are checked
   * with a real call before anything is stored; then the paid-order webhook is registered and
   * the shop's products are read. Returns a warning when the webhook could not be set up.
   */
  async connect(seller: User, input: ConnectInput) {
    const shopUrl =
      input.provider === 'shopify' ? shopifyDomain(input.shopUrl) : wooSiteUrl(input.shopUrl)
    if (!shopUrl) {
      throw new StoreError(
        input.provider === 'shopify'
          ? 'Enter your shop address, e.g. my-shop.myshopify.com'
          : 'Enter your shop address, e.g. https://www.my-shop.com'
      )
    }
    const secret = input.apiSecret.trim()
    const key = input.apiKey?.trim() || null
    const token = input.accessToken?.trim() || null
    if (secret.length < 8) throw new StoreError('Enter the secret from your shop')
    if (!key && !(input.provider === 'shopify' && token)) {
      throw new StoreError(
        input.provider === 'shopify' ? 'Enter the client ID of your app' : 'Enter the consumer key'
      )
    }

    const externalShopId = input.provider === 'shopify' ? shopUrl : new URL(shopUrl).host
    const existing = await StoreConnection.query()
      .where('provider', input.provider)
      .where('externalShopId', externalShopId)
      .first()
    if (existing && existing.sellerUserId !== seller.id) {
      throw new StoreError('This shop is already connected to another Fabrmatch account')
    }

    const connection = existing ?? new StoreConnection()
    connection.merge({
      sellerUserId: seller.id,
      provider: input.provider,
      externalShopId,
      shopUrl,
      shopName: connection.shopName ?? externalShopId,
      apiKeyEnc: key ? this.encryption.encrypt(key) : null,
      apiSecretEnc: this.encryption.encrypt(secret),
      accessTokenEnc: token ? this.encryption.encrypt(token) : null,
      tokenExpiresAt: null,
      status: 'active',
    })
    const adapter = storeAdapter(input.provider)
    const shop = await adapter.verify(connection)
    connection.shopName = shop.shopName.slice(0, 200)
    connection.currency = shop.currency?.slice(0, 3) ?? null
    await connection.save()
    await AuditLog.create({
      actorId: seller.id,
      action: 'store.connected',
      subjectType: 'store_connection',
      subjectId: connection.id,
      meta: { provider: input.provider, shop: externalShopId },
    })

    let warning: string | null = null
    try {
      await adapter.ensureWebhooks(connection, this.callbackUrl(connection))
    } catch (error) {
      warning = `Orders will not arrive automatically yet: ${(error as Error).message}`
      logger.warn({ msg: 'store webhook setup failed', id: connection.id, error })
    }
    await this.syncListings(seller, connection.id)
    return { connection, warning }
  }

  callbackUrl(connection: StoreConnection) {
    return `${env.get('APP_URL').replace(/\/$/, '')}/webhooks/stores/${connection.id}/orders`
  }

  /**
   * Printify-style publish: the product goes to the seller's shop with one variant per material
   * at the seller's price, and every variant is linked here at once (no manual mapping).
   * Publishing again updates the same product in the shop.
   */
  async publish(
    seller: User,
    connectionId: number,
    sellerProductId: number,
    variants: PublishVariant[]
  ) {
    const connection = await this.ownConnection(seller, connectionId)
    const product = await SellerProduct.query()
      .where('id', sellerProductId)
      .whereHas('sellerProfile', (q) => q.where('userId', seller.id))
      .preload('catalogProduct')
      .first()
    const catalog = product?.catalogProduct
    if (!product || !catalog || !catalog.isActive || !catalog.modelFileId) {
      throw new StoreError('Choose one of your own, available products')
    }
    if (product.status === 'archived') {
      throw new StoreError('This product is archived; make it active or draft first')
    }
    const allowed = catalog.allowedMaterials.map((m) => m.toUpperCase())
    const chosen = [...new Map(variants.map((v) => [v.material.toUpperCase(), v])).values()]
    if (chosen.length === 0) throw new StoreError('Choose at least one material')
    for (const v of chosen) {
      if (!allowed.includes(v.material.toUpperCase())) {
        throw new StoreError(`Material ${v.material} is not available for this product`)
      }
      if (!Number.isInteger(v.priceMinor) || v.priceMinor < 100) {
        throw new StoreError('Set a price for every material')
      }
    }

    // the shop product we created before (also when it was taken off sale), found by our SKU
    const previous = await ExternalListing.query()
      .where('storeConnectionId', connection.id)
      .where('sellerProductId', product.id)
      .whereLike('sku', `FM-${product.id}-%`)
      .orderBy('id', 'desc')
      .first()
    const images = await new ProductImageService().forModelFiles([catalog.modelFileId])
    const base = env.get('APP_URL').replace(/\/$/, '')
    // the shop downloads images from us, so only a public https address works
    const imageUrls = base.startsWith('https://')
      ? (images.get(catalog.modelFileId) ?? []).slice(0, 8).map((i) => `${base}${i.url}`)
      : []

    const result = await storeAdapter(connection.provider).publishProduct(
      connection,
      {
        title: product.title,
        description: product.description ?? '',
        imageUrls,
        currency: connection.currency ?? 'TRY',
        variants: chosen.map((v) => ({
          material: v.material.toUpperCase(),
          sku: fabrmatchSku(product.id, v.material),
          priceMinor: v.priceMinor,
        })),
      },
      previous?.externalProductId ?? null
    )
    const price = new Map(chosen.map((v) => [v.material.toUpperCase(), v.priceMinor]))
    for (const variant of result.variants) {
      await db
        .table('external_listings')
        .insert({
          store_connection_id: connection.id,
          external_product_id: result.productId,
          external_variant_id: variant.variantId,
          sku: variant.sku,
          title: `${product.title} — ${variant.material}`.slice(0, 300),
          seller_product_id: product.id,
          material: variant.material,
          scale_percent: 100,
          published: true,
          price_minor: price.get(variant.material) ?? null,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .onConflict(['store_connection_id', 'external_variant_id'])
        .merge([
          'external_product_id',
          'sku',
          'title',
          'seller_product_id',
          'material',
          'scale_percent',
          'published',
          'price_minor',
          'updated_at',
        ])
    }
    await AuditLog.create({
      actorId: seller.id,
      action: previous ? 'store.product_updated' : 'store.product_published',
      subjectType: 'store_connection',
      subjectId: connection.id,
      meta: { sellerProductId: product.id, externalProductId: result.productId },
    })
    return result
  }

  /**
   * Takes a published product off sale in one shop, or in every shop of the seller when
   * `connectionId` is null (used when the seller archives the product). A shop that cannot be
   * reached does not stop the others; the failures are returned.
   */
  async unpublish(seller: User, sellerProductId: number, connectionId: number | null = null) {
    const listings = await ExternalListing.query()
      .where('sellerProductId', sellerProductId)
      .where('published', true)
    const byShop = new Map<number, string>()
    for (const listing of listings) byShop.set(listing.storeConnectionId, listing.externalProductId)
    const failed: string[] = []
    for (const [shopId, productId] of byShop) {
      if (connectionId !== null && shopId !== connectionId) continue
      const connection = await StoreConnection.query()
        .where('id', shopId)
        .where('sellerUserId', seller.id)
        .where('status', 'active')
        .first()
      if (!connection) continue
      try {
        await storeAdapter(connection.provider).unpublishProduct(connection, productId)
        await ExternalListing.query()
          .where('storeConnectionId', shopId)
          .where('externalProductId', productId)
          .update({ published: false, updated_at: new Date() })
        await AuditLog.create({
          actorId: seller.id,
          action: 'store.product_unpublished',
          subjectType: 'store_connection',
          subjectId: shopId,
          meta: { sellerProductId, externalProductId: productId },
        })
      } catch (error) {
        failed.push(`${connection.shopName}: ${(error as Error).message}`)
      }
    }
    return { failed }
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
    await this.autoMapBySku(seller, connection)
    connection.lastSyncedAt = DateTime.now()
    await connection.save()
    return variants.length
  }

  /** Variants carrying our SKU (FM-<product>-<material>) link themselves to the seller's product. */
  private async autoMapBySku(seller: User, connection: StoreConnection) {
    const unmapped = await ExternalListing.query()
      .where('storeConnectionId', connection.id)
      .whereNull('sellerProductId')
      .whereLike('sku', 'FM-%')
    for (const listing of unmapped) {
      const match = SKU_PATTERN.exec(listing.sku ?? '')
      if (!match) continue
      const product = await SellerProduct.query()
        .where('id', Number(match[1]))
        .whereHas('sellerProfile', (q) => q.where('userId', seller.id))
        .preload('catalogProduct')
        .first()
      if (
        !product?.catalogProduct?.allowedMaterials.map((m) => m.toUpperCase()).includes(match[2])
      ) {
        continue
      }
      listing.merge({ sellerProductId: product.id, material: match[2], scalePercent: 100 })
      await listing.save()
    }
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
    const event = await storeAdapter(connection.provider).parseOrderWebhook(
      connection,
      rawBody,
      headers
    )
    if (!event) return { duplicate: false as const, ignored: true as const }
    if (event.type === 'cancelled') {
      await this.shopCancelled(connection, event.externalOrderId)
      return { duplicate: false as const, cancelled: true as const }
    }
    return this.importOrder(connection, event.order)
  }

  /**
   * The shop cancelled or refunded the order. Nothing started yet → cancelled here too (money the
   * seller paid goes back through the normal refund path). Already printing → it still ships,
   * and the seller is told so. An order we never placed simply stops waiting.
   */
  async shopCancelled(connection: StoreConnection, externalOrderId: string) {
    const external = await ExternalOrder.query()
      .where('storeConnectionId', connection.id)
      .where('externalOrderId', externalOrderId)
      .preload('order')
      .first()
    if (!external || external.shopCancelledAt) return
    external.shopCancelledAt = DateTime.now()

    const shopOrder = external.externalOrderName ?? externalOrderId
    const order = external.order
    if (!order) {
      external.merge({ status: 'cancelled', error: 'Cancelled in the shop before it was placed' })
      await external.save()
      return
    }
    const cancellable = ['draft', 'awaiting_payment', 'paid', 'matching', 'unmatched']
    if (cancellable.includes(order.status)) {
      await new OrderService().cancelWithRefund(order.id, { actorId: null, by: 'system' })
      external.merge({ status: 'cancelled' })
      await external.save()
      await this.notifier.storeOrder(
        connection.sellerUserId,
        { storeStep: 'cancelled', shopOrder, code: order.code, orderId: order.id },
        `store:${external.id}:cancelled`
      )
      return
    }
    if (order.status !== 'cancelled') {
      await external.save()
      await this.notifier.storeOrder(
        connection.sellerUserId,
        { storeStep: 'cancel_too_late', shopOrder, code: order.code, orderId: order.id },
        `store:${external.id}:cancel-late`
      )
    }
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
    const mapping = new Map<
      string,
      {
        sellerProductId: number
        material: string
        color: string | null
        scalePercent: number | null
      }
    >()
    for (const line of order.lines) {
      const listing = byVariant.get(line.variantId)
      if (listing?.sellerProductId && listing.material) {
        mapping.set(line.variantId, {
          sellerProductId: listing.sellerProductId,
          material: listing.material,
          color: listing.color,
          scalePercent: listing.scalePercent,
        })
        continue
      }
      // a product we published carries our SKU even before its variants were read back
      const bySku = SKU_PATTERN.exec(line.sku ?? '')
      if (bySku) {
        mapping.set(line.variantId, {
          sellerProductId: Number(bySku[1]),
          material: bySku[2],
          color: null,
          scalePercent: 100,
        })
      }
    }
    const unmapped = order.lines.filter((l) => !mapping.has(l.variantId))
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
      await this.notifier.storeOrder(
        connection.sellerUserId,
        { storeStep: 'needs_mapping', shopOrder: order.externalOrderName ?? order.externalOrderId },
        `store:${order.id}:needs-mapping`
      )
      return
    }

    const seller = await User.findOrFail(connection.sellerUserId)
    const address = JSON.parse(this.encryption.decrypt(order.shippingAddressEnc)) as ShippingAddress
    try {
      const created = await new OrderService().createExternalDraft(
        seller,
        order.lines.map((l) => ({ ...mapping.get(l.variantId)!, quantity: l.quantity })),
        address,
        storeAdapter(connection.provider).channel
      )
      order.merge({ orderId: created.id, status: 'placed', error: null })
      await order.save()
      // Printify-style: paid from the seller's balance at once when there is enough
      if (await this.autoPay(seller, created)) {
        await this.notifier.storeOrder(
          connection.sellerUserId,
          {
            storeStep: 'paid_from_wallet',
            shopOrder: order.externalOrderName ?? order.externalOrderId,
            code: created.code,
            orderId: created.id,
            amountMinor: created.totalMinor,
            currency: created.currency,
          },
          `store:${order.id}:placed`
        )
        return
      }
      await this.notifier.storeOrder(
        connection.sellerUserId,
        {
          storeStep: 'needs_payment',
          shopOrder: order.externalOrderName ?? order.externalOrderId,
          code: created.code,
          orderId: created.id,
          amountMinor: created.totalMinor,
          currency: created.currency,
        },
        `store:${order.id}:placed`
      )
    } catch (error) {
      order.merge({ status: 'failed', error: (error as Error).message.slice(0, 500) })
      await order.save()
      logger.warn({ msg: 'external order could not be placed', id: order.id, error })
      await this.notifier.storeOrder(
        connection.sellerUserId,
        {
          storeStep: 'failed',
          shopOrder: order.externalOrderName ?? order.externalOrderId,
          reason: order.error,
        },
        `store:${order.id}:failed`
      )
    }
  }

  /** True when the order was paid from the seller's balance (auto-pay on and enough money). */
  private async autoPay(seller: User, order: { id: number; totalMinor: number; currency: string }) {
    const profile = await SellerProfile.query().where('userId', seller.id).first()
    if (!profile?.walletAutoPay || order.currency !== 'TRY') return false
    try {
      await new PaymentService().payFromWallet(order.id, seller.id)
      return true
    } catch (error) {
      logger.info({
        msg: 'auto-pay from wallet skipped',
        orderId: order.id,
        reason: (error as Error).message,
      })
      return false
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
