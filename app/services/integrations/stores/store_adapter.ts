import DomainError from '#exceptions/domain_error'
import type StoreConnection from '#models/store_connection'
import type { ShippingAddress } from '#services/orders/order_service'

export class StoreWebhookSignatureError extends DomainError {
  constructor() {
    super('Invalid store webhook signature', { status: 401 })
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

/**
 * One platform (Shopify R4-T1, Etsy R4-T5). The core (mapping, import, write-back) depends on
 * this interface only; every adapter must pass `tests/contracts/store_adapter_contract.ts`.
 */
export interface StoreAdapter {
  readonly provider: StoreConnection['provider']
  /** Order channel the platform's orders are recorded under */
  readonly channel: 'shopify' | 'etsy'
  listVariants(connection: StoreConnection): Promise<StoreVariant[]>
  /** Verifies the signature and parses an order webhook; throws StoreWebhookSignatureError. */
  parseOrderWebhook(
    connection: StoreConnection,
    rawBody: string,
    headers: Record<string, string | undefined>
  ): Promise<IncomingOrder>
  /** Marks the order shipped in the shop with our tracking; must be safe to repeat. */
  pushFulfillment(
    connection: StoreConnection,
    externalOrderId: string,
    shipment: { carrier: string; trackingNumber: string }
  ): Promise<void>
}
