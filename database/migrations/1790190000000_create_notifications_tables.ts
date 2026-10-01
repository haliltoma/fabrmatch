import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('notifications', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.string('type', 48).notNullable()
      table.string('title', 160).notNullable()
      table.text('body').notNullable()
      // safe, recipient-scoped facts only (order id/code, link) — never other parties' identity
      table.jsonb('data').notNullable().defaultTo('{}')
      // idempotency: the same event never notifies the same user twice
      table.string('event_key', 160).notNullable()
      table.timestamp('emailed_at').nullable()
      table.timestamp('read_at').nullable()
      table.timestamp('created_at').notNullable()

      table.unique(['user_id', 'event_key'])
      table.index(['user_id', 'read_at'])
    })

    this.schema.createTable('notification_preferences', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.string('type', 48).notNullable()
      table.boolean('email').notNullable().defaultTo(true)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['user_id', 'type'])
    })
  }

  async down() {
    this.schema.dropTable('notification_preferences')
    this.schema.dropTable('notifications')
  }
}
