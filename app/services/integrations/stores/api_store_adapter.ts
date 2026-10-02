import type StoreConnection from '#models/store_connection'
import {
  StoreApiError,
  StoreWebhookSignatureError,
  type PublishResult,
  type StoreAdapter,
  type StoreEvent,
  type StoreVariant,
} from '#services/integrations/stores/store_adapter'

/**
 * W4: the seller's own website. It is not a shop we call: it calls us (`POST /api/v1/orders`)
 * and hears back through the seller's webhooks (`order.shipped` carries the tracking number).
 * So this adapter only has to say yes to the import pipeline and no to everything shop-side.
 */
export default class ApiStoreAdapter implements StoreAdapter {
  readonly provider = 'api' as const
  readonly channel = 'api' as const

  async verify(): Promise<{ shopName: string; currency: string | null }> {
    return { shopName: 'Your website (API)', currency: 'TRY' }
  }

  async ensureWebhooks(): Promise<void> {}

  async listVariants(): Promise<StoreVariant[]> {
    return []
  }

  async publishProduct(): Promise<PublishResult> {
    throw new StoreApiError('Your website reads products through the API; nothing to publish')
  }

  async unpublishProduct(): Promise<void> {}

  async parseOrderWebhook(): Promise<StoreEvent | null> {
    throw new StoreWebhookSignatureError()
  }

  /** The tracking reaches the seller's site as the `order.shipped` webhook event. */
  async pushFulfillment(_connection: StoreConnection): Promise<void> {}
}
