import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Paket W (W4): a seller's own website orders through the API. Its orders are recorded under the
 * `api` channel through one hidden `api` connection per seller (external_shop_id `api-<user id>`),
 * so they get the same once-per-external-id import as shop orders. Keys get a scope.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.raw(
      'alter table store_connections drop constraint store_connections_provider_check'
    )
    this.schema.raw(
      `alter table store_connections add constraint store_connections_provider_check
         check (provider in ('shopify', 'etsy', 'woocommerce', 'wix', 'fake', 'api'))`
    )
    this.schema.raw('alter table orders drop constraint if exists orders_channel_check')
    this.schema.raw(
      `alter table orders add constraint orders_channel_check
         check (channel in ('storefront','shopify','etsy','woocommerce','wix','api','rfq','direct','sample'))`
    )
    this.schema.alterTable('api_keys', (table) => {
      // read: look only; read_write: also quote, order and cancel
      table.string('scope', 20).notNullable().defaultTo('read')
    })
    this.schema.raw(
      `alter table api_keys add constraint api_keys_scope_check check (scope in ('read', 'read_write'))`
    )
  }

  async down() {
    this.schema.alterTable('api_keys', (table) => {
      table.dropColumn('scope')
    })
    this.schema.raw('alter table orders drop constraint if exists orders_channel_check')
    this.schema.raw(
      `alter table orders add constraint orders_channel_check
         check (channel in ('storefront','shopify','etsy','woocommerce','wix','rfq','direct','sample'))`
    )
    this.schema.raw(
      'alter table store_connections drop constraint store_connections_provider_check'
    )
    this.schema.raw(
      `alter table store_connections add constraint store_connections_provider_check
         check (provider in ('shopify', 'etsy', 'woocommerce', 'wix', 'fake'))`
    )
  }
}
