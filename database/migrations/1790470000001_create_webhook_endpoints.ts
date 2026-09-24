import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('webhook_endpoints', (table) => {
      table.increments('id')
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.string('url', 500).notNullable()
      // signing secret, encrypted at rest (we need it back to sign every delivery)
      table.text('secret_enc').notNullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.integer('consecutive_failures').notNullable().defaultTo(0)
      table.string('disabled_reason', 200).nullable()
      table.timestamp('created_at').notNullable()
      table.index(['user_id'])
    })
  }

  async down() {
    this.schema.dropTable('webhook_endpoints')
  }
}
