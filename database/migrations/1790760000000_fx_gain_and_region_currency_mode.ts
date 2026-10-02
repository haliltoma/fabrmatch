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
  'platform_spread',
]
/** Paket V (V4, K-V4): what the FX buffer and the round-up earned on a foreign-currency order. */
const ACCOUNTS_AFTER = [...ACCOUNTS_BEFORE, 'fx_gain']
const list = (values: string[]) => values.map((v) => `'${v}'`).join(', ')

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
      // in the order's currency; 0 for TRY orders
      table.integer('fx_gain_minor').notNullable().defaultTo(0)
    })
    this.schema.alterTable('pricing_regions', (table) => {
      // converted: TRY prices at the rate + buffer, rounded up (gain → fx_gain);
      // local: sellers may set their own prices in the region's currency (falls back to converted)
      table.string('currency_mode', 16).notNullable().defaultTo('converted')
      // null = the global FX buffer of /admin/settings
      table.integer('fx_buffer_bps').nullable()
    })
    this.schema.raw(
      "alter table pricing_regions add constraint pricing_regions_currency_mode_check check (currency_mode in ('converted', 'local'))"
    )
    this.accounts(ACCOUNTS_AFTER)
  }

  async down() {
    this.accounts(ACCOUNTS_BEFORE)
    this.schema.raw(
      'alter table pricing_regions drop constraint if exists pricing_regions_currency_mode_check'
    )
    this.schema.alterTable('pricing_regions', (table) => {
      table.dropColumn('currency_mode')
      table.dropColumn('fx_buffer_bps')
    })
    this.schema.alterTable('orders', (table) => {
      table.dropColumn('fx_gain_minor')
    })
  }
}
