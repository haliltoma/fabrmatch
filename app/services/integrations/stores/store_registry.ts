import app from '@adonisjs/core/services/app'
import DomainError from '#exceptions/domain_error'
import type { StoreProvider } from '#models/store_connection'
import FakeStoreAdapter from '#services/integrations/stores/fake_store_adapter'
import type { StoreAdapter } from '#services/integrations/stores/store_adapter'

const overrides = new Map<StoreProvider, StoreAdapter>()
let fake: FakeStoreAdapter | null = null

/**
 * Adapter per platform. Shopify (R4-T1) and Etsy (R4-T5) wait for their app keys (K-E); the
 * test shop only exists in development and tests.
 */
export function storeAdapter(provider: StoreProvider): StoreAdapter {
  const override = overrides.get(provider)
  if (override) return override
  if (provider === 'fake') {
    if (!(app.inDev || app.inTest)) throw new DomainError('The test shop is not available here')
    return (fake ??= new FakeStoreAdapter())
  }
  throw new DomainError(`${provider === 'shopify' ? 'Shopify' : 'Etsy'} is not connected yet`)
}

/** Tests swap an adapter in (null restores the default). */
export function setStoreAdapter(provider: StoreProvider, adapter: StoreAdapter | null) {
  if (adapter) overrides.set(provider, adapter)
  else overrides.delete(provider)
}
