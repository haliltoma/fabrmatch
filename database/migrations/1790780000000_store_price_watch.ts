import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Paket V (V6): shop prices kept in step with production. A connection either warns the seller
 * (watch) or updates the shop itself (auto); each published variant remembers what it cost us in
 * the shop's currency at the last check and how the shop price compares.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('store_connections', (table) => {
      table.string('price_mode', 8).notNullable().defaultTo('watch')
    })
    this.schema.raw(
      "alter table store_connections add constraint store_connections_price_mode_check check (price_mode in ('watch', 'auto'))"
    )
    this.schema.alterTable('external_listings', (table) => {
      table.integer('cost_minor').nullable()
      // ok | thin (below half the seller's margin) | loss (below cost)
      table.string('price_status', 8).nullable()
      table.timestamp('price_checked_at').nullable()
    })
  }

  async down() {
    this.schema.alterTable('external_listings', (table) => {
      table.dropColumn('cost_minor')
      table.dropColumn('price_status')
      table.dropColumn('price_checked_at')
    })
    this.schema.raw(
      'alter table store_connections drop constraint if exists store_connections_price_mode_check'
    )
    this.schema.alterTable('store_connections', (table) => {
      table.dropColumn('price_mode')
    })
  }
}
