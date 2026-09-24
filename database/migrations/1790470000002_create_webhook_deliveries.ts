import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('webhook_deliveries', (table) => {
      table.increments('id')
      table
        .integer('endpoint_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('webhook_endpoints')
        .onDelete('CASCADE')
      // one event is sent to an endpoint once, however often the row is retried
      table.string('event_id', 40).notNullable()
      table.string('event_type', 60).notNullable()
      table.jsonb('payload').notNullable()
      table.enum('status', ['pending', 'delivered', 'failed']).notNullable().defaultTo('pending')
      table.integer('attempts').notNullable().defaultTo(0)
      table.timestamp('next_attempt_at').notNullable()
      table.integer('last_status_code').nullable()
      table.string('last_error', 300).nullable()
      table.timestamp('delivered_at').nullable()
      table.timestamp('created_at').notNullable()
      table.unique(['endpoint_id', 'event_id'])
      table.index(['status', 'next_attempt_at'])
    })
  }

  async down() {
    this.schema.dropTable('webhook_deliveries')
  }
}
