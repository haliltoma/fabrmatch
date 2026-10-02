import { StoreConnectionSchema } from '#database/schema'

export type StoreProvider = 'shopify' | 'etsy' | 'woocommerce' | 'wix' | 'fake'

/** A seller's shop on another platform (R4). */
export default class StoreConnection extends StoreConnectionSchema {
  declare provider: StoreProvider
  declare status: 'active' | 'disconnected'
}
