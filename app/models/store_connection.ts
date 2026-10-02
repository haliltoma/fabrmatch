import { StoreConnectionSchema } from '#database/schema'

/** `api`: the seller's own website ordering through the API (W4), one hidden connection each */
export type StoreProvider = 'shopify' | 'etsy' | 'woocommerce' | 'wix' | 'fake' | 'api'

/** A seller's shop on another platform (R4). */
export default class StoreConnection extends StoreConnectionSchema {
  declare provider: StoreProvider
  declare status: 'active' | 'disconnected'
}
