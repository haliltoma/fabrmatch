import { PayoutSchema } from '#database/schema'
import { belongsTo, hasOne } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasOne } from '@adonisjs/lucid/types/relations'
import Order from '#models/order'
import PayoutDocument from '#models/payout_document'

/** `awaiting_document`: Fabrmatch is the buyer of the work (R7) and the payee's invoice is not approved yet. */
export type PayoutStatus = 'awaiting_document' | 'pending' | 'paid' | 'failed'
export type PayoutBeneficiary = 'manufacturer' | 'seller'

export default class Payout extends PayoutSchema {
  declare status: PayoutStatus
  declare beneficiaryType: PayoutBeneficiary

  @belongsTo(() => Order)
  declare order: BelongsTo<typeof Order>

  /** Invoice or expense voucher behind it (sales model B) */
  @hasOne(() => PayoutDocument)
  declare document: HasOne<typeof PayoutDocument>
}
