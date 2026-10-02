import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Paket V: a maker's own costs (machine hour, setup, waste, failed prints, profit), and the price
 * per gram of a printer's material becomes what the maker pays for it per kilogram.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('maker_cost_profiles', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table
        .uuid('manufacturer_profile_id')
        .notNullable()
        .unique()
        .references('id')
        .inTable('manufacturer_profiles')
        .onDelete('CASCADE')
      table.integer('hourly_rate_minor').notNullable()
      table.integer('setup_minor').notNullable()
      table.integer('waste_bps').notNullable()
      table.integer('failure_bps').notNullable()
      table.integer('profit_bps').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
    this.schema.raw(
      'alter table maker_cost_profiles add constraint maker_cost_profiles_failure_check check (failure_bps >= 0 and failure_bps < 10000)'
    )

    this.schema.alterTable('printer_materials', (table) => {
      table.integer('material_cost_per_kg_minor').nullable()
    })
    this.schema.raw(
      'update printer_materials set material_cost_per_kg_minor = price_per_gram_minor * 1000'
    )
    this.schema.alterTable('printer_materials', (table) => {
      table.integer('material_cost_per_kg_minor').notNullable().alter()
      table.dropColumn('price_per_gram_minor')
    })
  }

  async down() {
    this.schema.alterTable('printer_materials', (table) => {
      table.integer('price_per_gram_minor').nullable()
    })
    this.schema.raw(
      'update printer_materials set price_per_gram_minor = ceil(material_cost_per_kg_minor / 1000.0)'
    )
    this.schema.alterTable('printer_materials', (table) => {
      table.integer('price_per_gram_minor').notNullable().alter()
      table.dropColumn('material_cost_per_kg_minor')
    })
    this.schema.dropTable('maker_cost_profiles')
  }
}
