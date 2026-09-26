import { LedgerEntrySchema } from '#database/schema'

export type LedgerAccount =
  | 'provider_cash'
  | 'buyer_escrow'
  | 'platform_fee'
  | 'manufacturer_payable'
  | 'seller_payable'
  | 'refund'
  /** Output VAT on sales (Fabrmatch is the seller, R7-T2) */
  | 'vat_payable'
  /** Input VAT on payees' invoices, reclaimable (debit-normal) */
  | 'vat_receivable'
  /** Income tax withheld from home producers, owed to the tax office */
  | 'withholding_payable'

export type LedgerDirection = 'debit' | 'credit'

export default class LedgerEntry extends LedgerEntrySchema {
  declare account: LedgerAccount
  declare direction: LedgerDirection
}
