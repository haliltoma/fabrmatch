import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('tax_rates', (table) => {
      table.string('country', 2).primary()
      table.string('name', 40).notNullable()
      table.integer('rate_bps').notNullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('created_at').notNullable()
    })
    this.schema.raw(
      `insert into tax_rates (country, name, rate_bps, created_at) values ('TR', 'KDV', 2000, now())`
    )

    this.schema.alterTable('orders', (table) => {
      // prices are tax-inclusive: tax_minor is the part of total_minor that is tax
      table.integer('tax_rate_bps').notNullable().defaultTo(0)
      table.integer('tax_minor').notNullable().defaultTo(0)
    })
  }

  async down() {
    this.schema.alterTable('orders', (table) => {
      table.dropColumn('tax_rate_bps')
      table.dropColumn('tax_minor')
    })
    this.schema.dropTable('tax_rates')
  }
}
