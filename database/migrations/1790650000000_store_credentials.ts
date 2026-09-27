import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Shops connected with the seller's own credentials (Printify-style): Shopify (shop domain +
 * client id/secret from a Dev Dashboard app, or a legacy admin token) and WooCommerce (site URL +
 * consumer key/secret). Every secret is encrypted; the Shopify access token is short-lived.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.raw(
      'alter table store_connections drop constraint store_connections_provider_check'
    )
    this.schema.raw(
      `alter table store_connections add constraint store_connections_provider_check
         check (provider in ('shopify', 'etsy', 'woocommerce', 'fake'))`
    )
    this.schema.alterTable('store_connections', (table) => {
      table.string('shop_url', 300).nullable()
      table.text('api_key_enc').nullable()
      table.text('api_secret_enc').nullable()
      table.timestamp('token_expires_at').nullable()
      table.string('currency', 3).nullable()
    })
    this.schema.raw('alter table orders drop constraint if exists orders_channel_check')
    this.schema.raw(
      `alter table orders add constraint orders_channel_check
         check (channel in ('storefront','shopify','etsy','woocommerce','rfq','direct','sample'))`
    )
    this.schema.alterTable('external_listings', (table) => {
      // listing Fabrmatch created in the shop (published), as opposed to one mapped by hand
      table.boolean('published').notNullable().defaultTo(false)
      table.integer('price_minor').nullable()
    })
  }

  async down() {
    this.schema.raw('alter table orders drop constraint if exists orders_channel_check')
    this.schema.raw(
      `alter table orders add constraint orders_channel_check
         check (channel in ('storefront','shopify','etsy','rfq','direct','sample'))`
    )
    this.schema.alterTable('external_listings', (table) => {
      table.dropColumn('published')
      table.dropColumn('price_minor')
    })
    this.schema.alterTable('store_connections', (table) => {
      table.dropColumn('shop_url')
      table.dropColumn('api_key_enc')
      table.dropColumn('api_secret_enc')
      table.dropColumn('token_expires_at')
      table.dropColumn('currency')
    })
    this.schema.raw(
      'alter table store_connections drop constraint store_connections_provider_check'
    )
    this.schema.raw(
      `alter table store_connections add constraint store_connections_provider_check
         check (provider in ('shopify', 'etsy', 'fake'))`
    )
  }
}
