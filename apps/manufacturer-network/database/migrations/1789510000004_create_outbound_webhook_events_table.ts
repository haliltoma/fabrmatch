import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Çift kayıt defterinin Sistem B tarafı (09): her Sistem A webhook'u önce burada
 * `pending` olarak yazılır, teslim edilince `delivered`, tüm denemeler bitince `failed`.
 */
export default class extends BaseSchema {
  protected tableName = 'outbound_webhook_events'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('public_id', 32).notNullable().unique()
      table
        .integer('production_request_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('production_requests')
        .onDelete('CASCADE')
      table.string('status', 24).notNullable()
      table.jsonb('payload').notNullable()
      table.string('state', 16).notNullable().defaultTo('pending')
      table.integer('attempts').notNullable().defaultTo(0)
      table.timestamp('next_attempt_at').nullable()
      table.text('last_error').nullable()
      table.timestamp('delivered_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['state', 'next_attempt_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
