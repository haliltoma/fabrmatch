import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // carrier webhooks are deduplicated by the carrier's own event id, like payment webhooks
    this.schema.createTable('carrier_events', (table) => {
      table.increments('id')
      table.string('provider', 30).notNullable()
      table.string('event_id', 120).notNullable()
      table.string('tracking_number', 60).notNullable()
      table.string('status', 30).notNullable()
      table.timestamp('received_at').notNullable()
      table.timestamp('processed_at').nullable()
      table.unique(['provider', 'event_id'])
    })
  }

  async down() {
    this.schema.dropTable('carrier_events')
  }
}
