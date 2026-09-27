import { InvoiceSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Order from '#models/order'

export default class Invoice extends InvoiceSchema {
  declare kind: 'platform_fee'
  declare status: 'issued' | 'voided'

  @belongsTo(() => Order)
  declare order: BelongsTo<typeof Order>
}
