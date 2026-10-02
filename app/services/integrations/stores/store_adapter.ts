import type { DateTime } from 'luxon'
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

/** One sellable combination: material × colour × size (W3). */
export interface PublishVariant {
  material: string
  /** Colour name from our colour list; null = the product is sold without a colour choice */
  color: string | null
  scalePercent: number
  /** What buyers read for the size, e.g. "62 × 62 × 83 mm" */
  sizeLabel: string
  sku: string
  priceMinor: number
  /** Picture of this colour (URL platforms), also listed in `imageUrls` */
  imageUrl?: string | null
}

/** A Fabrmatch product as it should appear in the seller's shop. */
export interface PublishInput {
  title: string
  description: string
  imageUrls: string[]
  variants: PublishVariant[]
  currency: string
  /** Platform category (Etsy taxonomy id); ignored where the platform needs none */
  categoryId?: string | null
  /** Image files, for platforms that take uploads instead of URLs (Etsy) */
  images?: Array<{ bytes: Buffer; contentType: string }>
}

export interface PublishResult {
  productId: string
  /** The shop's id for each of our variants, matched by SKU */
  variants: Array<{ variantId: string; sku: string }>
}

export type OptionName = 'Material' | 'Colour' | 'Size' | 'Material / Size'

/**
 * The shop options a set of variants needs: Material always, Colour and Size only when they
 * vary. A platform with fewer option slots (`maxOptions`) gets Material and Size merged into one.
 */
export function variantOptions(variants: PublishVariant[], maxOptions = 3) {
  const hasColour = variants.some((v) => v.color !== null)
  const hasSize = new Set(variants.map((v) => v.scalePercent)).size > 1
  const merge = hasSize && hasColour && maxOptions < 3
  const names: OptionName[] = merge
    ? ['Material / Size', 'Colour']
    : [
        'Material',
        ...(hasColour ? (['Colour'] as const) : []),
        ...(hasSize ? (['Size'] as const) : []),
      ]
  const valuesOf = (v: PublishVariant) =>
    names.map((name) => ({
      name,
      value:
        name === 'Material'
          ? v.material
          : name === 'Colour'
            ? (v.color ?? '—')
            : name === 'Size'
              ? v.sizeLabel
              : `${v.material} · ${v.sizeLabel}`,
    }))
  /** Every option's values in first-seen order (what platforms list as choices) */
  const choices = names.map((name, i) => ({
    name,
    values: [...new Set(variants.map((v) => valuesOf(v)[i].value))],
  }))
  return { names, valuesOf, choices }
}

/** "Black" → "BLACK", "Sky blue" → "SKYBL": the colour part of a SKU (at most 5 characters). */
export function colourCode(name: string) {
  return (
    name
      .toUpperCase()
      .replaceAll(/[^A-Z0-9]/g, '')
      .slice(0, 5) || 'X'
  )
}

/**
 * One platform. The core (connect, publish, mapping, import, write-back) depends on this
 * interface only; every adapter passes `tests/contracts/store_adapter_contract.ts`.
 */
export interface StoreAdapter {
  readonly provider: StoreConnection['provider']
  /** Order channel the platform's orders are recorded under */
  readonly channel: 'shopify' | 'etsy' | 'woocommerce' | 'wix' | 'api'
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
  /** Platforms without order webhooks (Etsy): paid orders and cancellations since `since`. */
  pollOrders?(connection: StoreConnection, since: DateTime): Promise<StoreEvent[]>
  /**
   * Paket V (V6): cancels the shop's order when we cancelled ours; `refunded` says whether the
   * platform refunded its customer too (Shopify does, WooCommerce and Wix do not: the seller is
   * asked to). Absent on platforms with no API for it (Etsy): the seller does both in the shop.
   */
  cancelOrder?(
    connection: StoreConnection,
    externalOrderId: string,
    reason: string
  ): Promise<{ refunded: boolean }>
  /** Marks the order shipped in the shop with our tracking; must be safe to repeat. */
  pushFulfillment(
    connection: StoreConnection,
    externalOrderId: string,
    shipment: { carrier: string; trackingNumber: string }
  ): Promise<void>
}

/**
 * The short key of a seller product in our SKUs: the last 12 hex digits of its UUIDv7 (48 random
 * bits). A full UUID would not fit shop SKU limits (Etsy allows 32 characters); the key is only
 * ever resolved among one seller's products, where 48 random bits do not collide.
 */
export function skuKey(sellerProductId: string) {
  return sellerProductId.replaceAll('-', '').slice(-12).toUpperCase()
}

/**
 * Stable SKU for a Fabrmatch product variant. Material only (the original size, no colour):
 * FM-<key>-<MATERIAL>, as before W3. With a colour or another size:
 * FM-<key>-<MATERIAL>-<COLOUR|X>-<PERCENT>, at most 32 characters (Etsy's limit).
 */
export function fabrmatchSku(
  sellerProductId: string,
  material: string,
  color: string | null = null,
  scalePercent = 100
) {
  const base = `FM-${skuKey(sellerProductId)}-${material.toUpperCase()}`
  if (color === null && scalePercent === 100) return base
  return `${base}-${color === null ? 'X' : colourCode(color)}-${scalePercent}`
}

/** Our SKUs: product key, material, and (W3) colour code + size percent */
export const SKU_PATTERN = /^FM-([0-9A-F]{12})-([A-Z0-9]+)(?:-([A-Z0-9]{1,5})-(\d{2,3}))?$/i

/** 12345 → "123.45" (prices travel as decimal strings; integer maths only). */
export function decimalPrice(minor: number) {
  return `${Math.floor(minor / 100)}.${String(minor % 100).padStart(2, '0')}`
}

/** Seller text as shop HTML: escaped, line breaks kept (shops render descriptions as HTML). */
export function descriptionHtml(text: string) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\n', '<br>')
}
