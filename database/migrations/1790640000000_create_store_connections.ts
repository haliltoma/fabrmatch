import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * External stores (R4-T3/T4 core; Shopify R4-T1 and Etsy R4-T5 plug in as adapters).
 * - store_connections: a seller's shop on another platform, its token encrypted
 * - external_listings: the shop's variants and which of our products each one is (SKU mapping)
 * - external_orders: every order the shop sent us, once per external id, and the Fabrmatch
 *   order it became; tracking is written back to the shop when the parcel ships
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('store_connections', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table
        .uuid('seller_user_id')
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.enu('provider', ['shopify', 'etsy', 'fake']).notNullable()
      table.string('shop_name', 200).notNullable()
      // the shop's own id on the platform (myshopify domain, Etsy shop id)
      table.string('external_shop_id', 200).notNullable()
      table.text('access_token_enc').nullable()
      table.text('webhook_secret_enc').nullable()
      table.enu('status', ['active', 'disconnected']).notNullable().defaultTo('active')
      table.timestamp('last_synced_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
      table.unique(['provider', 'external_shop_id'])
    })

    this.schema.createTable('external_listings', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table
        .uuid('store_connection_id')
        .notNullable()
        .references('id')
        .inTable('store_connections')
        .onDelete('CASCADE')
      table.string('external_product_id', 100).notNullable()
      table.string('external_variant_id', 100).notNullable()
      table.string('sku', 100).nullable()
      table.string('title', 300).notNullable()
      table
        .uuid('seller_product_id')
        .nullable()
        .references('id')
        .inTable('seller_products')
        .onDelete('SET NULL')
      table.string('material', 20).nullable()
      table.string('color', 40).nullable()
      table.integer('scale_percent').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
      table.unique(['store_connection_id', 'external_variant_id'])
    })

    this.schema.createTable('external_orders', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table
        .uuid('store_connection_id')
        .notNullable()
        .references('id')
        .inTable('store_connections')
        .onDelete('CASCADE')
      table.string('external_order_id', 100).notNullable()
      table.string('external_order_name', 100).nullable()
      table.uuid('order_id').nullable().references('id').inTable('orders').onDelete('SET NULL')
      table.enu('status', ['needs_mapping', 'placed', 'ignored', 'failed']).notNullable()
      // lines as the shop sent them (variant, sku, quantity) — no customer data
      table.jsonb('lines').notNullable()
      table.text('shipping_address_enc').notNullable()
      table.string('error', 500).nullable()
      table
        .enu('fulfillment_status', ['none', 'pending', 'pushed', 'failed'])
        .notNullable()
        .defaultTo('none')
      table.integer('fulfillment_attempts').notNullable().defaultTo(0)
      table.string('fulfillment_error', 500).nullable()
      table.timestamp('fulfillment_pushed_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
      table.unique(['store_connection_id', 'external_order_id'])
      table.index(['fulfillment_status'])
    })
  }

  async down() {
    this.schema.dropTable('external_orders')
    this.schema.dropTable('external_listings')
    this.schema.dropTable('store_connections')
  }
}
