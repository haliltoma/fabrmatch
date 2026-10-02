import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Paket V (V6): when we cancel an order that came from a seller's shop, the shop order is cancelled
 * too. none | done | manual (the platform has no API: the seller cancels it) | failed
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('external_orders', (table) => {
      table.string('shop_cancel_status', 8).notNullable().defaultTo('none')
      table.string('shop_cancel_error', 300).nullable()
    })
  }

  async down() {
    this.schema.alterTable('external_orders', (table) => {
      table.dropColumn('shop_cancel_status')
      table.dropColumn('shop_cancel_error')
    })
  }
}
