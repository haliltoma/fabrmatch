import { BaseSchema } from '@adonisjs/lucid/schema'

export const LEDGER_ACCOUNTS = [
  'provider_cash',
  'buyer_escrow',
  'platform_fee',
  'manufacturer_payable',
  'seller_payable',
  'refund',
]

export default class extends BaseSchema {
  async up() {
    // Split of the order total, fixed at draft time so release never has to re-derive prices.
    // manufacturer payable = total - platform_fee - seller_share (includes shipping).
    this.schema.alterTable('orders', (table) => {
      table.integer('platform_fee_minor').notNullable().defaultTo(0)
      table.integer('seller_share_minor').notNullable().defaultTo(0)
    })

    this.schema.createTable('payments', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table.uuid('order_id').notNullable().references('id').inTable('orders').onDelete('RESTRICT')
      table.string('provider', 16).notNullable()
      table.string('provider_ref', 128).notNullable()
      table
        .enu('status', ['pending', 'succeeded', 'failed', 'refunded', 'partially_refunded'])
        .notNullable()
        .defaultTo('pending')
      table.integer('amount_minor').notNullable()
      table.integer('refunded_minor').notNullable().defaultTo(0)
      table.string('currency', 3).notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['provider', 'provider_ref'])
      table.index(['order_id'])
    })

    // Webhook dedup: at-least-once delivery → the unique key makes replays a no-op.
    this.schema.createTable('payment_webhooks', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table.string('provider', 16).notNullable()
      table.string('provider_event_id', 128).notNullable()
      table.string('type', 64).notNullable()
      table.jsonb('payload').notNullable()
      table.timestamp('received_at').notNullable()
      table.timestamp('processed_at').nullable()

      table.unique(['provider', 'provider_event_id'])
    })

    this.schema.createTable('ledger_entries', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table.uuid('transaction_id').notNullable()
      table.enu('account', LEDGER_ACCOUNTS).notNullable()
      table.enu('direction', ['debit', 'credit']).notNullable()
      table.integer('amount_minor').notNullable()
      table.string('currency', 3).notNullable()
      table.uuid('order_id').nullable().references('id').inTable('orders').onDelete('RESTRICT')
      table.string('memo', 128).nullable()
      table.timestamp('created_at').notNullable()

      table.index(['transaction_id'])
      table.index(['order_id'])
      table.index(['account'])
    })
    this.schema.raw(
      'alter table ledger_entries add constraint ledger_entries_amount_positive check (amount_minor > 0)'
    )

    // Every transaction must balance per currency, checked at COMMIT so entries can be
    // inserted one by one. The service validates too; this is the last line of defence.
    this.schema.raw(`
      create or replace function ledger_assert_balanced() returns trigger as $$
      declare
        imbalance integer;
      begin
        select coalesce(sum(case when direction = 'debit' then amount_minor else -amount_minor end), 0)
          into imbalance
          from ledger_entries
         where transaction_id = new.transaction_id and currency = new.currency;
        if imbalance <> 0 then
          raise exception 'ledger transaction % is unbalanced by % (%)',
            new.transaction_id, imbalance, new.currency;
        end if;
        return null;
      end;
      $$ language plpgsql
    `)
    this.schema.raw(`
      create constraint trigger ledger_entries_balanced
        after insert on ledger_entries
        deferrable initially deferred
        for each row execute function ledger_assert_balanced()
    `)

    this.schema.createTable('payouts', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table.uuid('order_id').notNullable().references('id').inTable('orders').onDelete('RESTRICT')
      table.enu('beneficiary_type', ['manufacturer', 'seller']).notNullable()
      table.uuid('beneficiary_id').notNullable()
      table.integer('amount_minor').notNullable()
      table.string('currency', 3).notNullable()
      table.string('provider_ref', 128).nullable()
      table.enu('status', ['pending', 'paid', 'failed']).notNullable().defaultTo('pending')
      table.timestamp('paid_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      // Idempotent release: one payout per beneficiary per order.
      table.unique(['order_id', 'beneficiary_type'])
    })

    this.schema.createTable('disputes', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table.uuid('order_id').notNullable().references('id').inTable('orders').onDelete('RESTRICT')
      table.uuid('opened_by').notNullable().references('id').inTable('users').onDelete('RESTRICT')
      table.text('reason').notNullable()
      table.enu('status', ['open', 'responded', 'resolved']).notNullable().defaultTo('open')
      table.enu('resolution', ['full_refund', 'partial_refund', 'release']).nullable()
      table.integer('refund_minor').notNullable().defaultTo(0)
      table.text('manufacturer_response').nullable()
      table.text('admin_note').nullable()
      table.uuid('resolved_by').nullable().references('id').inTable('users')
      table.timestamp('resolved_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['order_id'])
      table.index(['status'])
    })
    // At most one open dispute per order.
    this.schema.raw(
      `create unique index disputes_one_open_per_order on disputes (order_id) where status <> 'resolved'`
    )

    this.schema.createTable('dispute_evidence', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table
        .uuid('dispute_id')
        .notNullable()
        .references('id')
        .inTable('disputes')
        .onDelete('CASCADE')
      table.uuid('uploader_id').notNullable().references('id').inTable('users').onDelete('RESTRICT')
      table.string('storage_key', 512).notNullable()
      table.text('note').nullable()
      table.timestamp('created_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable('dispute_evidence')
    this.schema.dropTable('disputes')
    this.schema.dropTable('payouts')
    this.schema.raw('drop trigger if exists ledger_entries_balanced on ledger_entries')
    this.schema.dropTable('ledger_entries')
    this.schema.raw('drop function if exists ledger_assert_balanced()')
    this.schema.dropTable('payment_webhooks')
    this.schema.dropTable('payments')
    this.schema.alterTable('orders', (table) => {
      table.dropColumn('platform_fee_minor')
      table.dropColumn('seller_share_minor')
    })
  }
}
