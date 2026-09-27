import { createHmac } from 'node:crypto'
import type StoreConnection from '#models/store_connection'
import EncryptionService from '#services/identity/encryption_service'
import { sameHex } from '#services/payments/iyzico/iyzico_client'
import {
  StoreWebhookSignatureError,
  type IncomingOrder,
  type StoreAdapter,
  type StoreVariant,
} from '#services/integrations/stores/store_adapter'

export const FAKE_STORE_SIGNATURE_HEADER = 'x-fake-store-signature'

/**
 * In-memory shop for tests and local development: the same HMAC-signed webhook shape the real
 * platforms use, a variant list you can edit, and a record of what was written back.
 */
export default class FakeStoreAdapter implements StoreAdapter {
  readonly provider = 'fake' as const
  readonly channel = 'shopify' as const

  variants: StoreVariant[] = [
    { productId: 'p1', variantId: 'v1', sku: 'VASE-S', title: 'Spiral vase — small' },
    { productId: 'p1', variantId: 'v2', sku: 'VASE-L', title: 'Spiral vase — large' },
    { productId: 'p2', variantId: 'v3', sku: null, title: 'Cable clip (10 pack)' },
  ]
  fulfillments: Array<{ externalOrderId: string; carrier: string; trackingNumber: string }> = []
  failFulfillment = false

  async listVariants(): Promise<StoreVariant[]> {
    return this.variants
  }

  /** The body and headers the shop would POST for a new order. */
  signedOrder(connection: StoreConnection, order: IncomingOrder) {
    const body = JSON.stringify(order)
    return { body, headers: { [FAKE_STORE_SIGNATURE_HEADER]: this.sign(connection, body) } }
  }

  async parseOrderWebhook(
    connection: StoreConnection,
    rawBody: string,
    headers: Record<string, string | undefined>
  ): Promise<IncomingOrder> {
    const given = headers[FAKE_STORE_SIGNATURE_HEADER] ?? ''
    if (!given || !sameHex(given, this.sign(connection, rawBody))) {
      throw new StoreWebhookSignatureError()
    }
    return JSON.parse(rawBody) as IncomingOrder
  }

  async pushFulfillment(
    _connection: StoreConnection,
    externalOrderId: string,
    shipment: { carrier: string; trackingNumber: string }
  ) {
    if (this.failFulfillment) throw new Error('fake store: fulfillment failed')
    const existing = this.fulfillments.find((f) => f.externalOrderId === externalOrderId)
    if (existing) return
    this.fulfillments.push({ externalOrderId, ...shipment })
  }

  private sign(connection: StoreConnection, body: string) {
    const secret = connection.webhookSecretEnc
      ? new EncryptionService().decrypt(connection.webhookSecretEnc)
      : ''
    return createHmac('sha256', secret).update(body).digest('hex')
  }
}
