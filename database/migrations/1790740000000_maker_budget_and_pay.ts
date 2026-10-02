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
  'chargeback_loss',
]
/** Paket V: what the fixed price left over above the accepting maker's own price (K-V3). */
const ACCOUNTS_AFTER = [...ACCOUNTS_BEFORE, 'platform_spread']
const list = (values: string[]) => values.map((v) => `'${v}'`).join(', ')

/**
 * Paket V (K-V1/K-V3): an order carries the maker budget its price was fixed with (TRY), an offer
 * the pay the maker sees (TRY, their own floor), a job the pay agreed on acceptance (order currency,
 * parts only; shipping is added at payout as before).
 */
export default class extends BaseSchema {
  private accounts(accounts: string[]) {
    this.schema.raw('alter table ledger_entries drop constraint ledger_entries_account_check')
    this.schema.raw(
      `alter table ledger_entries add constraint ledger_entries_account_check
         check (account in (${list(accounts)}))`
    )
  }

  async up() {
    this.schema.alterTable('orders', (table) => {
      table.integer('maker_budget_minor').nullable()
    })
    this.schema.alterTable('match_offers', (table) => {
      table.integer('maker_pay_minor').nullable()
    })
    this.schema.alterTable('production_jobs', (table) => {
      table.integer('agreed_pay_minor').nullable()
    })
    this.accounts(ACCOUNTS_AFTER)
  }

  async down() {
    this.accounts(ACCOUNTS_BEFORE)
    this.schema.alterTable('production_jobs', (table) => {
      table.dropColumn('agreed_pay_minor')
    })
    this.schema.alterTable('match_offers', (table) => {
      table.dropColumn('maker_pay_minor')
    })
    this.schema.alterTable('orders', (table) => {
      table.dropColumn('maker_budget_minor')
    })
  }
}
