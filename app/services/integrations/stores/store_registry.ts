import app from '@adonisjs/core/services/app'
import DomainError from '#exceptions/domain_error'
import type { StoreProvider } from '#models/store_connection'
import FakeStoreAdapter from '#services/integrations/stores/fake_store_adapter'
import ShopifyAdapter from '#services/integrations/stores/shopify_adapter'
import WooCommerceAdapter from '#services/integrations/stores/woocommerce_adapter'
import EtsyAdapter, { etsyConfigured } from '#services/integrations/stores/etsy_adapter'
import WixAdapter, { wixConfigured } from '#services/integrations/stores/wix_adapter'
import type { StoreAdapter } from '#services/integrations/stores/store_adapter'

const overrides = new Map<StoreProvider, StoreAdapter>()
let fake: FakeStoreAdapter | null = null

/**
 * Adapter per platform. Shopify and WooCommerce connect with the seller's own credentials.
 * Etsy has no key-only access (OAuth with our registered app, R4-T5). The test shop only
 * exists in development and tests. Wix sites add our registered app (V8).
 */
export function storeAdapter(provider: StoreProvider): StoreAdapter {
  const override = overrides.get(provider)
  if (override) return override
  switch (provider) {
    case 'shopify':
      return new ShopifyAdapter()
    case 'woocommerce':
      return new WooCommerceAdapter()
    case 'fake':
      if (!(app.inDev || app.inTest)) throw new DomainError('The test shop is not available here')
      return (fake ??= new FakeStoreAdapter())
    case 'etsy':
      if (!etsyConfigured()) throw new DomainError('Etsy is not set up on Fabrmatch yet')
      return new EtsyAdapter()
    case 'wix':
      if (!wixConfigured()) throw new DomainError('Wix is not set up on Fabrmatch yet')
      return new WixAdapter()
  }
}

/** Tests swap an adapter in (null restores the default). */
export function setStoreAdapter(provider: StoreProvider, adapter: StoreAdapter | null) {
  if (adapter) overrides.set(provider, adapter)
  else overrides.delete(provider)
}
