import { LedgerEntrySchema } from '#database/schema'

export type LedgerAccount =
  | 'provider_cash'
  | 'buyer_escrow'
  | 'platform_fee'
  | 'manufacturer_payable'
  | 'seller_payable'
  | 'refund'

export type LedgerDirection = 'debit' | 'credit'

export default class LedgerEntry extends LedgerEntrySchema {
  declare account: LedgerAccount
  declare direction: LedgerDirection
}
