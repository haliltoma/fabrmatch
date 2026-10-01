import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('invoice_counters', (table) => {
      table.integer('year').primary()
      table.integer('last_number').notNullable().defaultTo(0)
    })

    this.schema.createTable('invoices', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table.uuid('order_id').notNullable().references('id').inTable('orders').onDelete('RESTRICT')
      // the platform's own invoice for its commission; makers and sellers invoice their own share
      table.enum('kind', ['platform_fee']).notNullable().defaultTo('platform_fee')
      table.uuid('recipient_user_id').notNullable().references('id').inTable('users')
      table.string('number', 24).notNullable().unique()
      table.integer('net_minor').notNullable()
      table.integer('tax_rate_bps').notNullable()
      table.integer('tax_minor').notNullable()
      table.integer('gross_minor').notNullable()
      table.string('currency', 3).notNullable()
      table.enum('status', ['issued', 'voided']).notNullable().defaultTo('issued')
      table.string('provider', 30).notNullable()
      table.string('provider_ref', 120).nullable()
      table.timestamp('issued_at').notNullable()
      table.unique(['order_id', 'kind'])
    })
  }

  async down() {
    this.schema.dropTable('invoices')
    this.schema.dropTable('invoice_counters')
  }
}
