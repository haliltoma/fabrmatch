import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'seller_products'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table
        .uuid('seller_profile_id')
        .notNullable()
        .references('id')
        .inTable('seller_profiles')
        .onDelete('CASCADE')
      table
        .uuid('catalog_product_id')
        .nullable()
        .references('id')
        .inTable('catalog_products')
        .onDelete('SET NULL')
      table.string('title', 255).notNullable()
      table.text('description').nullable()
      table.integer('retail_price_minor').unsigned().notNullable()
      table.string('currency', 3).notNullable().defaultTo('TRY')
      table.integer('margin_bps').unsigned().notNullable().defaultTo(2000)
      table.enum('status', ['draft', 'active', 'archived']).notNullable().defaultTo('draft')

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
