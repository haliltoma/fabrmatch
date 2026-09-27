import DomainError from '#exceptions/domain_error'
import type StoreConnection from '#models/store_connection'
import type { ShippingAddress } from '#services/orders/order_service'

export class StoreWebhookSignatureError extends DomainError {
  constructor() {
    super('Invalid store webhook signature', { status: 401 })
  }
}

/** The shop refused or failed a call; the message is safe to show the seller. */
export class StoreApiError extends DomainError {
  constructor(message: string) {
    super(message, { status: 502 })
  }
}

export interface StoreVariant {
  productId: string
  variantId: string
  sku: string | null
  title: string
}

export interface IncomingOrder {
  externalOrderId: string
  /** What the shop shows its owner, e.g. "#1042" */
  name: string | null
  lines: Array<{ variantId: string; sku: string | null; title: string; quantity: number }>
  shippingAddress: ShippingAddress
}

/** What a genuine shop delivery means for us. */
export type StoreEvent =
  { type: 'paid'; order: IncomingOrder } | { type: 'cancelled'; externalOrderId: string }

/** A Fabrmatch product as it should appear in the seller's shop (one variant per material). */
export interface PublishInput {
  title: string
  description: string
  imageUrls: string[]
  variants: Array<{ material: string; sku: string; priceMinor: number }>
  currency: string
}

export interface PublishResult {
  productId: string
  variants: Array<{ variantId: string; sku: string; material: string }>
}

/**
 * One platform. The core (connect, publish, mapping, import, write-back) depends on this
 * interface only; every adapter passes `tests/contracts/store_adapter_contract.ts`.
 */
export interface StoreAdapter {
  readonly provider: StoreConnection['provider']
  /** Order channel the platform's orders are recorded under */
  readonly channel: 'shopify' | 'etsy' | 'woocommerce'
  /** Proves the credentials work; returns what the shop calls itself and its currency. */
  verify(connection: StoreConnection): Promise<{ shopName: string; currency: string | null }>
  /** Subscribes the shop's paid orders to our endpoint (safe to call again). */
  ensureWebhooks(connection: StoreConnection, callbackUrl: string): Promise<void>
  listVariants(connection: StoreConnection): Promise<StoreVariant[]>
  /** Creates the product in the shop, or updates it when `existingProductId` is given. */
  publishProduct(
    connection: StoreConnection,
    input: PublishInput,
    existingProductId: string | null
  ): Promise<PublishResult>
  /** Takes the product off sale in the shop (kept as a draft, so it can come back). */
  unpublishProduct(connection: StoreConnection, productId: string): Promise<void>
  /**
   * Verifies the signature and parses an order webhook; throws StoreWebhookSignatureError.
   * A paid order to print, a cancellation, or null for anything else (ping, unpaid, other topic).
   */
  parseOrderWebhook(
    connection: StoreConnection,
    rawBody: string,
    headers: Record<string, string | undefined>
  ): Promise<StoreEvent | null>
  /** Marks the order shipped in the shop with our tracking; must be safe to repeat. */
  pushFulfillment(
    connection: StoreConnection,
    externalOrderId: string,
    shipment: { carrier: string; trackingNumber: string }
  ): Promise<void>
}

/** Stable SKU for a Fabrmatch product in a material, so orders map even without a listing row. */
export function fabrmatchSku(sellerProductId: number, material: string) {
  return `FM-${sellerProductId}-${material.toUpperCase()}`
}

/** 12345 → "123.45" (prices travel as decimal strings; integer maths only). */
export function decimalPrice(minor: number) {
  return `${Math.floor(minor / 100)}.${String(minor % 100).padStart(2, '0')}`
}
