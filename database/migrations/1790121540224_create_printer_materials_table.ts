import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'printer_materials'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table
        .uuid('printer_id')
        .notNullable()
        .references('id')
        .inTable('printers')
        .onDelete('CASCADE')
      table.string('material', 50).notNullable()
      table.jsonb('colors').notNullable().defaultTo('[]')
      table.integer('price_per_gram_minor').unsigned().notNullable()
      table.string('currency', 3).notNullable().defaultTo('TRY')

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['printer_id', 'material'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
