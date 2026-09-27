import { BaseSchema } from '@adonisjs/lucid/schema'

const ACCOUNTS_BEFORE = [
  'provider_cash',
  'buyer_escrow',
  'platform_fee',
  'manufacturer_payable',
  'seller_payable',
  'refund',
  'vat_payable',
  'vat_receivable',
  'withholding_payable',
  'seller_wallet',
]
/** What a lost chargeback cost the platform beyond the escrow and unpaid payouts (debit-normal). */
const ACCOUNTS_AFTER = [...ACCOUNTS_BEFORE, 'chargeback_loss']
const STATUSES_BEFORE = ['awaiting_document', 'pending', 'paid', 'failed']
/** A payout voided before it was paid, e.g. because the bank took the order's money back. */
const STATUSES_AFTER = [...STATUSES_BEFORE, 'cancelled']
const list = (values: string[]) => values.map((v) => `'${v}'`).join(', ')

export default class extends BaseSchema {
  private constraints(accounts: string[], statuses: string[]) {
    this.schema.raw('alter table ledger_entries drop constraint ledger_entries_account_check')
    this.schema.raw(
      `alter table ledger_entries add constraint ledger_entries_account_check
         check (account in (${list(accounts)}))`
    )
    this.schema.raw('alter table payouts drop constraint payouts_status_check')
    this.schema.raw(
      `alter table payouts add constraint payouts_status_check
         check (status in (${list(statuses)}))`
    )
  }

  async up() {
    this.constraints(ACCOUNTS_AFTER, STATUSES_AFTER)
  }

  async down() {
    this.constraints(ACCOUNTS_BEFORE, STATUSES_BEFORE)
  }
}
