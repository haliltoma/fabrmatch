import { BaseSchema } from '@adonisjs/lucid/schema'

const ACCOUNTS_BEFORE = [
  'provider_cash',
  'buyer_escrow',
  'platform_fee',
  'manufacturer_payable',
  'seller_payable',
  'refund',
]
/** R7-T2 (Fabrmatch is the seller): output VAT owed, input VAT to reclaim, tax withheld from payees. */
const ACCOUNTS_AFTER = [...ACCOUNTS_BEFORE, 'vat_payable', 'vat_receivable', 'withholding_payable']

const list = (values: string[]) => values.map((v) => `'${v}'`).join(', ')

/**
 * R7-T2..T4 (sales model B, docs/legal/satis-ve-fatura-modeli.md).
 * - payee_tax_profiles: who a maker/seller is for tax purposes, where the money goes, and whether
 *   an admin approved it. Nothing is paid out to an unapproved payee.
 * - payout_documents: the purchase document behind each payout — the payee's invoice to
 *   Fabrmatch, or the expense voucher (gider pusulası) Fabrmatch issues for home producers.
 * - payouts: gross / VAT / withholding breakdown and `awaiting_document` (invoice not approved yet).
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('payee_tax_profiles', (table) => {
      table.increments('id')
      table.enu('beneficiary_type', ['manufacturer', 'seller']).notNullable()
      // same id the payouts use: manufacturer_profiles.id, or the seller's users.id
      table.integer('beneficiary_id').notNullable()
      table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table
        .enu('tax_status', ['company', 'sole_proprietor', 'simple_method', 'home_exempt'])
        .notNullable()
      table.string('legal_name', 200).notNullable()
      table.text('tax_number_enc').notNullable()
      table.string('tax_office', 120).notNullable()
      table.text('address_enc').notNullable()
      table.text('iban_enc').notNullable()
      table.string('document_key', 255).nullable()
      table.string('document_content_type', 64).nullable()
      table.enu('status', ['pending_review', 'approved', 'rejected']).notNullable()
      table.string('rejection_reason', 500).nullable()
      table.integer('reviewed_by').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.timestamp('reviewed_at').nullable()
      table.timestamp('submitted_at').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
      table.unique(['beneficiary_type', 'beneficiary_id'])
      table.index(['status'])
    })

    this.schema.alterTable('payouts', (table) => {
      // before withholding and, for payees outside VAT, without the VAT the buyer paid
      table.integer('gross_minor').nullable()
      table.integer('vat_minor').notNullable().defaultTo(0)
      table.integer('withholding_minor').notNullable().defaultTo(0)
      table.string('tax_status', 32).nullable()
      table.string('paid_reference', 128).nullable()
    })
    this.schema.raw('alter table payouts drop constraint payouts_status_check')
    this.schema.raw(
      `alter table payouts add constraint payouts_status_check
         check (status in ('awaiting_document', 'pending', 'paid', 'failed'))`
    )
    this.schema.raw('alter table ledger_entries drop constraint ledger_entries_account_check')
    this.schema.raw(
      `alter table ledger_entries add constraint ledger_entries_account_check
         check (account in (${list(ACCOUNTS_AFTER)}))`
    )

    this.schema.createTable('payout_documents', (table) => {
      table.increments('id')
      table
        .integer('payout_id')
        .notNullable()
        .unique()
        .references('id')
        .inTable('payouts')
        .onDelete('RESTRICT')
      table.enu('kind', ['supplier_invoice', 'expense_voucher']).notNullable()
      table.string('number', 64).notNullable()
      table.date('issued_on').notNullable()
      table.integer('gross_minor').notNullable()
      table.integer('vat_minor').notNullable().defaultTo(0)
      table.integer('withholding_minor').notNullable().defaultTo(0)
      table.string('currency', 3).notNullable()
      table.string('file_key', 255).nullable()
      table.string('file_content_type', 64).nullable()
      table.enu('status', ['submitted', 'approved', 'rejected']).notNullable()
      table.string('rejection_reason', 500).nullable()
      table.integer('reviewed_by').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.timestamp('reviewed_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
      table.index(['status'])
    })
    // expense voucher numbers are gapless per year, like invoices
    this.schema.raw(
      `create unique index payout_documents_voucher_number on payout_documents (number)
         where kind = 'expense_voucher'`
    )
  }

  async down() {
    this.schema.dropTable('payout_documents')
    this.schema.raw('alter table ledger_entries drop constraint ledger_entries_account_check')
    this.schema.raw(
      `alter table ledger_entries add constraint ledger_entries_account_check
         check (account in (${list(ACCOUNTS_BEFORE)}))`
    )
    this.schema.raw('alter table payouts drop constraint payouts_status_check')
    this.schema.raw(
      `alter table payouts add constraint payouts_status_check
         check (status in ('pending', 'paid', 'failed'))`
    )
    this.schema.alterTable('payouts', (table) => {
      table.dropColumn('gross_minor')
      table.dropColumn('vat_minor')
      table.dropColumn('withholding_minor')
      table.dropColumn('tax_status')
      table.dropColumn('paid_reference')
    })
    this.schema.dropTable('payee_tax_profiles')
  }
}
