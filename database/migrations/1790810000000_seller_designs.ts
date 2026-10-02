import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Paket W (W1): a seller's own uploaded design becomes a catalogue entry that only they can sell
 * (`owner_user_id`; null = the platform catalogue every seller can use). `shop_listed` lets a
 * seller sell a product only in their own shops and site, not in the Fabrmatch shop.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('catalog_products', (table) => {
      table.uuid('owner_user_id').nullable().references('id').inTable('users').onDelete('CASCADE')
      table.index(['owner_user_id'])
    })
    this.schema.alterTable('seller_products', (table) => {
      table.boolean('shop_listed').notNullable().defaultTo(true)
    })
  }

  async down() {
    this.schema.alterTable('seller_products', (table) => {
      table.dropColumn('shop_listed')
    })
    this.schema.alterTable('catalog_products', (table) => {
      table.dropColumn('owner_user_id')
    })
  }
}
