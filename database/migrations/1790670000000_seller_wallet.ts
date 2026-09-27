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
]
/** Money a seller paid in advance, spent on their own production orders (R4-T2, K-E default). */
const ACCOUNTS_AFTER = [...ACCOUNTS_BEFORE, 'seller_wallet']
const list = (values: string[]) => values.map((v) => `'${v}'`).join(', ')

export default class extends BaseSchema {
  async up() {
    this.schema.raw('alter table ledger_entries drop constraint ledger_entries_account_check')
    this.schema.raw(
      `alter table ledger_entries add constraint ledger_entries_account_check
         check (account in (${list(ACCOUNTS_AFTER)}))`
    )
    this.schema.alterTable('ledger_entries', (table) => {
      // whose wallet a `seller_wallet` line belongs to
      table
        .integer('wallet_user_id')
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('RESTRICT')
      table.index(['wallet_user_id'])
    })
    this.schema.raw(
      `alter table ledger_entries add constraint ledger_entries_wallet_owner
         check ((account = 'seller_wallet') = (wallet_user_id is not null))`
    )

    // a payment pays an order, or tops up a wallet — exactly one of the two
    this.schema.raw('alter table payments alter column order_id drop not null')
    this.schema.alterTable('payments', (table) => {
      table
        .integer('wallet_user_id')
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('RESTRICT')
    })
    this.schema.raw(
      `alter table payments add constraint payments_order_or_wallet
         check ((order_id is null) <> (wallet_user_id is null))`
    )

    this.schema.alterTable('seller_profiles', (table) => {
      table.boolean('wallet_auto_pay').notNullable().defaultTo(true)
    })
  }

  async down() {
    this.schema.alterTable('seller_profiles', (table) => table.dropColumn('wallet_auto_pay'))
    this.schema.raw('alter table payments drop constraint payments_order_or_wallet')
    this.schema.alterTable('payments', (table) => table.dropColumn('wallet_user_id'))
    this.schema.raw('alter table payments alter column order_id set not null')
    this.schema.raw('alter table ledger_entries drop constraint ledger_entries_wallet_owner')
    this.schema.alterTable('ledger_entries', (table) => table.dropColumn('wallet_user_id'))
    this.schema.raw('alter table ledger_entries drop constraint ledger_entries_account_check')
    this.schema.raw(
      `alter table ledger_entries add constraint ledger_entries_account_check
         check (account in (${list(ACCOUNTS_BEFORE)}))`
    )
  }
}
