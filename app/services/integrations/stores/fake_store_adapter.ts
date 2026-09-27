import { createHmac } from 'node:crypto'
import type StoreConnection from '#models/store_connection'
import EncryptionService from '#services/identity/encryption_service'
import { sameHex } from '#services/payments/iyzico/iyzico_client'
import {
  StoreWebhookSignatureError,
  type IncomingOrder,
  type StoreEvent,
  type PublishInput,
  type PublishResult,
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
  webhooks: string[] = []
  published = new Map<string, PublishInput>()
  private nextId = 100

  async verify(connection: StoreConnection) {
    return { shopName: connection.shopName || 'Test shop', currency: 'TRY' }
  }

  async ensureWebhooks(_connection: StoreConnection, callbackUrl: string) {
    if (!this.webhooks.includes(callbackUrl)) this.webhooks.push(callbackUrl)
  }

  async publishProduct(
    _connection: StoreConnection,
    input: PublishInput,
    existingProductId: string | null
  ): Promise<PublishResult> {
    const productId = existingProductId ?? `p${++this.nextId}`
    this.published.set(productId, input)
    // an update keeps the variant ids of materials that were already there
    const known = new Map(
      this.variants.filter((v) => v.productId === productId).map((v) => [v.sku, v.variantId])
    )
    const variants = input.variants.map((v) => ({
      variantId: known.get(v.sku) ?? `v${++this.nextId}`,
      sku: v.sku,
      material: v.material,
    }))
    this.variants = [
      ...this.variants.filter((v) => v.productId !== productId),
      ...variants.map((v) => ({
        productId,
        variantId: v.variantId,
        sku: v.sku,
        title: `${input.title} — ${v.material}`,
      })),
    ]
    return { productId, variants }
  }

  async listVariants(): Promise<StoreVariant[]> {
    return this.variants
  }

  unpublished: string[] = []

  async unpublishProduct(_connection: StoreConnection, productId: string) {
    if (!this.unpublished.includes(productId)) this.unpublished.push(productId)
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
  ): Promise<StoreEvent | null> {
    const given = headers[FAKE_STORE_SIGNATURE_HEADER] ?? ''
    if (!given || !sameHex(given, this.sign(connection, rawBody))) {
      throw new StoreWebhookSignatureError()
    }
    const payload = JSON.parse(rawBody) as IncomingOrder & { cancelled?: boolean }
    if (payload.cancelled) return { type: 'cancelled', externalOrderId: payload.externalOrderId }
    return { type: 'paid', order: payload }
  }

  /** The body and headers the shop would POST when the order is cancelled. */
  signedCancellation(connection: StoreConnection, externalOrderId: string) {
    const body = JSON.stringify({ externalOrderId, cancelled: true })
    return { body, headers: { [FAKE_STORE_SIGNATURE_HEADER]: this.sign(connection, body) } }
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
