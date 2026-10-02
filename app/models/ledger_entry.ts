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
  /** Money a seller paid in advance for their own production orders (per `wallet_user_id`) */
  | 'seller_wallet'
  /** What a lost chargeback cost the platform beyond escrow and unpaid payouts (debit-normal) */
  | 'chargeback_loss'
  /** Paket V: the fixed price above the accepting maker's own price, kept by the platform */
  | 'platform_spread'

export type LedgerDirection = 'debit' | 'credit'

export default class LedgerEntry extends LedgerEntrySchema {
  declare account: LedgerAccount
  declare direction: LedgerDirection
}
