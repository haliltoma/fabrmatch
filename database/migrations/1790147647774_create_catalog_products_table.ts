import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'catalog_products'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table.string('title', 255).notNullable()
      table.string('slug', 255).notNullable().unique()
      table.text('description').nullable()
      table.string('model_file_key').nullable()
      table.jsonb('allowed_materials').notNullable().defaultTo('[]')
      table.boolean('is_active').notNullable().defaultTo(true)

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
