import { BaseSchema } from '@adonisjs/lucid/schema'

/** Paket V (V8): Wix sites as seller shops; their orders are recorded under the `wix` channel. */
export default class extends BaseSchema {
  async up() {
    this.schema.raw(
      'alter table store_connections drop constraint store_connections_provider_check'
    )
    this.schema.raw(
      `alter table store_connections add constraint store_connections_provider_check
         check (provider in ('shopify', 'etsy', 'woocommerce', 'wix', 'fake'))`
    )
    this.schema.raw('alter table orders drop constraint if exists orders_channel_check')
    this.schema.raw(
      `alter table orders add constraint orders_channel_check
         check (channel in ('storefront','shopify','etsy','woocommerce','wix','rfq','direct','sample'))`
    )
  }

  async down() {
    this.schema.raw('alter table orders drop constraint if exists orders_channel_check')
    this.schema.raw(
      `alter table orders add constraint orders_channel_check
         check (channel in ('storefront','shopify','etsy','woocommerce','rfq','direct','sample'))`
    )
    this.schema.raw(
      'alter table store_connections drop constraint store_connections_provider_check'
    )
    this.schema.raw(
      `alter table store_connections add constraint store_connections_provider_check
         check (provider in ('shopify', 'etsy', 'woocommerce', 'fake'))`
    )
  }
}
