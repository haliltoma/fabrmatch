import { ExternalOrderSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Order from '#models/order'
import StoreConnection from '#models/store_connection'

export interface ExternalOrderLine {
  variantId: string
  sku: string | null
  title: string
  quantity: number
}

/** An order a seller's shop sent us, stored once per external id (R4). */
export default class ExternalOrder extends ExternalOrderSchema {
  declare status: 'needs_mapping' | 'placed' | 'ignored' | 'failed'
  declare fulfillmentStatus: 'none' | 'pending' | 'pushed' | 'failed'
  declare lines: ExternalOrderLine[]

  @belongsTo(() => Order)
  declare order: BelongsTo<typeof Order>

  @belongsTo(() => StoreConnection)
  declare storeConnection: BelongsTo<typeof StoreConnection>
}
