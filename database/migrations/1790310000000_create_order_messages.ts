import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('order_messages', (table) => {
      table.increments('id')
      table
        .integer('order_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('orders')
        .onDelete('CASCADE')
      table.integer('sender_id').unsigned().notNullable().references('id').inTable('users')
      table.enum('sender_role', ['buyer', 'maker']).notNullable()
      // what the other side sees: contact details already masked
      table.text('body').notNullable()
      // what was actually typed, encrypted; only admins can read it
      table.text('original_enc').nullable()
      table.integer('masked_count').notNullable().defaultTo(0)
      table.timestamp('read_at').nullable()
      table.timestamp('created_at').notNullable()
      table.index(['order_id', 'id'])
    })
  }

  async down() {
    this.schema.dropTable('order_messages')
  }
}
