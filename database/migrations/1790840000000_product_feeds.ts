import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Paket W (W5): a seller's product feed (CSV/JSON) for any site or marketplace. The secret token
 * is looked up by its hash and kept encrypted so the panel can show the address again.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('seller_profiles', (table) => {
      table.string('feed_token_hash', 64).nullable().unique()
      table.text('feed_token_enc').nullable()
      // e.g. https://myshop.com/products/{id}: where each product lives on the seller's own site
      table.string('feed_link_template', 500).nullable()
    })
  }

  async down() {
    this.schema.alterTable('seller_profiles', (table) => {
      table.dropColumn('feed_token_hash')
      table.dropColumn('feed_token_enc')
      table.dropColumn('feed_link_template')
    })
  }
}
