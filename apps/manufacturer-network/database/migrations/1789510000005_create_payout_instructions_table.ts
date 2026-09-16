import { BaseSchema } from '@adonisjs/lucid/schema'

/** Sistem B hiçbir para hareketi yapmaz; sadece tutarı hesaplayıp talimat olarak bildirir (05). */
export default class extends BaseSchema {
  protected tableName = 'payout_instructions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      // Sistem A'daki idempotency anahtarı (pi_...)
      table.string('public_id', 32).notNullable().unique()
      table
        .integer('production_request_id')
        .unsigned()
        .notNullable()
        .unique()
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
      table.double('amount').notNullable()
      table.string('currency_code', 3).notNullable()
      // pending → sent (webhook teslim edildi)
      table.string('status', 16).notNullable().defaultTo('pending')
      table.timestamp('sent_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
