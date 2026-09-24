import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('categories', (table) => {
      table.increments('id')
      table.string('slug', 60).notNullable().unique()
      table.string('name', 80).notNullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('created_at').notNullable()
    })
    this.schema.alterTable('catalog_products', (table) => {
      table
        .integer('category_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('categories')
        .onDelete('SET NULL')
      table.jsonb('tags').notNullable().defaultTo('[]')
    })
  }

  async down() {
    this.schema.alterTable('catalog_products', (table) => {
      table.dropColumn('category_id')
      table.dropColumn('tags')
    })
    this.schema.dropTable('categories')
  }
}
