import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Paket V (V5, K-V5): a maker's surcharge for sending further than their own city, in basis points
 * of their price. Abroad is stored for when cross-border production opens (K-K).
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('maker_cost_profiles', (table) => {
      table.integer('other_city_bps').notNullable().defaultTo(0)
      table.integer('abroad_bps').notNullable().defaultTo(0)
    })
  }

  async down() {
    this.schema.alterTable('maker_cost_profiles', (table) => {
      table.dropColumn('other_city_bps')
      table.dropColumn('abroad_bps')
    })
  }
}
