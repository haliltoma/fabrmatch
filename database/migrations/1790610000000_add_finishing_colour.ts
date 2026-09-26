import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Painting needs a colour (R6-T6): options that do are flagged, and the buyer's choice travels on
 * the cart line and the order item so the maker knows what to paint.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('finishing_options', (table) => {
      table.boolean('needs_colour').notNullable().defaultTo(false)
    })
    this.schema.alterTable('order_items', (table) => {
      table.string('finishing_colour', 40).nullable()
    })
    this.schema.alterTable('cart_items', (table) => {
      table.string('finishing_colour', 40).nullable()
    })
    this.defer(async (db) => {
      await db.from('finishing_options').where('code', 'PAINT').update({ needs_colour: true })
    })
  }

  async down() {
    this.schema.alterTable('finishing_options', (table) => table.dropColumn('needs_colour'))
    this.schema.alterTable('order_items', (table) => table.dropColumn('finishing_colour'))
    this.schema.alterTable('cart_items', (table) => table.dropColumn('finishing_colour'))
  }
}
