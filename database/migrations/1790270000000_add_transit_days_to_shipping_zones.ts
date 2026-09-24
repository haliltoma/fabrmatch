import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('shipping_zones', (table) => {
      table.integer('transit_days_min').notNullable().defaultTo(2)
      table.integer('transit_days_max').notNullable().defaultTo(5)
    })
    // placeholders like the rates; the admin edits them with the carrier contract (D3)
    this.schema.raw(
      `update shipping_zones set transit_days_min = 1, transit_days_max = 3 where code = 'TR'`
    )
    this.schema.raw(
      `update shipping_zones set transit_days_min = 4, transit_days_max = 8 where code = 'EU'`
    )
    this.schema.raw(
      `update shipping_zones set transit_days_min = 7, transit_days_max = 14 where code = 'WORLD'`
    )
  }

  async down() {
    this.schema.alterTable('shipping_zones', (table) => {
      table.dropColumn('transit_days_min')
      table.dropColumn('transit_days_max')
    })
  }
}
