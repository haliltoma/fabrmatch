import { BaseSchema } from '@adonisjs/lucid/schema'

/** Paket W (W3): one render per colour a product is offered in (kind `colour_render`). */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('product_images', (table) => {
      table.string('color_hex', 7).nullable()
    })
  }

  async down() {
    this.schema.alterTable('product_images', (table) => {
      table.dropColumn('color_hex')
    })
  }
}
