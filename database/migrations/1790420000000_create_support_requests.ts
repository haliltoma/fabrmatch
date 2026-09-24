import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('support_requests', (table) => {
      table.increments('id')
      table
        .integer('user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.string('email', 254).notNullable()
      table.string('topic', 30).notNullable()
      table.string('order_code', 20).nullable()
      table.string('message', 2000).notNullable()
      table.enum('status', ['open', 'answered']).notNullable().defaultTo('open')
      table.timestamp('answered_at').nullable()
      table.timestamp('created_at').notNullable()
      table.index(['status'])
    })
  }

  async down() {
    this.schema.dropTable('support_requests')
  }
}
