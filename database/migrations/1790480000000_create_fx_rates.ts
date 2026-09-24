import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('fx_rates', (table) => {
      table.increments('id')
      table.string('currency', 3).notNullable()
      // units of `currency` per 1 TRY, scaled by 1e9 (integer only, no floats); no digits in the name, Lucid's snake_case would break it
      table.bigInteger('rate_nano').notNullable()
      table.string('source', 30).notNullable()
      table.date('as_of').notNullable()
      table.timestamp('created_at').notNullable()
      table.unique(['currency', 'as_of'])
    })
    this.schema.alterTable('orders', (table) => {
      table.integer('fx_rate_id').unsigned().nullable().references('id').inTable('fx_rates')
      // the rate this order was priced with (margin included); null for TRY orders
      table.bigInteger('fx_rate_nano').nullable()
      // TRY equivalent of total_minor: trust-tier and fraud limits, GMV
      table.integer('base_total_minor').notNullable().defaultTo(0)
    })
    this.defer(async (db) => {
      await db.rawQuery('update orders set base_total_minor = total_minor')
    })
  }

  async down() {
    this.schema.alterTable('orders', (table) => {
      table.dropColumn('base_total_minor')
      table.dropColumn('fx_rate_nano')
      table.dropColumn('fx_rate_id')
    })
    this.schema.dropTable('fx_rates')
  }
}
