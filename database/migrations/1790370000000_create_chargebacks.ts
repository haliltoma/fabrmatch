import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('chargebacks', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table.uuid('order_id').notNullable().references('id').inTable('orders').onDelete('CASCADE')
      table.uuid('payment_id').notNullable().references('id').inTable('payments')
      table.string('provider_event_id', 120).notNullable().unique()
      table.integer('amount_minor').notNullable()
      table.string('currency', 3).notNullable()
      // part of a lost chargeback that came out of escrow (the rest was already paid out)
      table.integer('written_off_minor').notNullable().defaultTo(0)
      table.enum('status', ['open', 'won', 'lost']).notNullable().defaultTo('open')
      table.string('note', 300).nullable()
      table.uuid('resolved_by').nullable().references('id').inTable('users')
      table.timestamp('resolved_at').nullable()
      table.timestamp('created_at').notNullable()
      table.index(['status'])
    })
  }

  async down() {
    this.schema.dropTable('chargebacks')
  }
}
