import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('seller_products', (table) => {
      // a seller may ask for makers of at least this trust tier; the maker is still never revealed
      table.integer('min_maker_tier').notNullable().defaultTo(0)
    })
  }

  async down() {
    this.schema.alterTable('seller_products', (table) => {
      table.dropColumn('min_maker_tier')
    })
  }
}
