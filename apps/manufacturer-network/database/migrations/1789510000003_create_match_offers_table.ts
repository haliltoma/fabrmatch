import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'match_offers'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('production_request_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('production_requests')
        .onDelete('CASCADE')
      table
        .integer('manufacturer_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('manufacturers')
        .onDelete('CASCADE')
      // score | exploration | protection — adil eşleştirme denetimi için saklanır (04)
      table.string('selection_reason', 16).notNullable()
      table.double('score').notNullable()
      table.jsonb('score_breakdown').notNullable()
      table.double('quoted_payout').nullable()
      table.string('status', 16).notNullable().defaultTo('offered')
      table.timestamp('expires_at').notNullable()
      table.timestamp('responded_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['manufacturer_id', 'status'])
      table.index(['production_request_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
