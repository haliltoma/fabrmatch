import { PayoutDocumentSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Payout from '#models/payout'

/** The purchase document behind a payout (R7-T4): the payee's invoice or our expense voucher. */
export default class PayoutDocument extends PayoutDocumentSchema {
  declare kind: 'supplier_invoice' | 'expense_voucher'
  declare status: 'submitted' | 'approved' | 'rejected'

  @belongsTo(() => Payout)
  declare payout: BelongsTo<typeof Payout>
}
