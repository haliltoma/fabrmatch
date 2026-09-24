import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * R0-T6. Both columns were never used by pricing:
 * - catalog_products.model_file_key was replaced by model_file_id (FK)
 * - seller_products.retail_price_minor: buyers pay the computed price (cost + fees + margin_bps)
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('catalog_products', (table) => {
      table.dropColumn('model_file_key')
    })
    this.schema.alterTable('seller_products', (table) => {
      table.dropColumn('retail_price_minor')
    })
  }

  async down() {
    this.schema.alterTable('seller_products', (table) => {
      table.integer('retail_price_minor').unsigned().notNullable().defaultTo(0)
    })
    this.schema.alterTable('catalog_products', (table) => {
      table.string('model_file_key').nullable()
    })
  }
}
