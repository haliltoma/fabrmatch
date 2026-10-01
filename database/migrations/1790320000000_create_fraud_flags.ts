import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('fraud_flags', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table.uuid('order_id').notNullable().references('id').inTable('orders').onDelete('CASCADE')
      table.string('rule', 40).notNullable()
      // hold = matching waits for an admin; review = matching runs, an admin looks later
      table.enum('severity', ['review', 'hold']).notNullable()
      table.string('detail', 300).notNullable()
      table.enum('status', ['open', 'cleared', 'rejected']).notNullable().defaultTo('open')
      table.uuid('resolved_by').nullable().references('id').inTable('users')
      table.timestamp('resolved_at').nullable()
      table.timestamp('created_at').notNullable()
      table.unique(['order_id', 'rule'])
      table.index(['status'])
    })
  }

  async down() {
    this.schema.dropTable('fraud_flags')
  }
}
