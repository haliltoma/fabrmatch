import { PayoutSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Order from '#models/order'

export type PayoutStatus = 'pending' | 'paid' | 'failed'
export type PayoutBeneficiary = 'manufacturer' | 'seller'

export default class Payout extends PayoutSchema {
  declare status: PayoutStatus
  declare beneficiaryType: PayoutBeneficiary

  @belongsTo(() => Order)
  declare order: BelongsTo<typeof Order>
}
