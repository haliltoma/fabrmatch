import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('catalog_products', (table) => {
      // sizes (percent of the original) a buyer may choose; [100] means no choice
      table.jsonb('allowed_scales').notNullable().defaultTo('[100]')
    })
    this.schema.alterTable('order_items', (table) => {
      table.integer('scale_percent').notNullable().defaultTo(100)
    })
  }

  async down() {
    this.schema.alterTable('order_items', (table) => {
      table.dropColumn('scale_percent')
    })
    this.schema.alterTable('catalog_products', (table) => {
      table.dropColumn('allowed_scales')
    })
  }
}
