import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('cart_items', (table) => {
      table.increments('id')
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table
        .integer('model_file_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('model_files')
        .onDelete('CASCADE')
      table.string('material', 32).notNullable()
      table
        .integer('print_profile_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('print_profiles')
        .onDelete('SET NULL')
      table.string('color', 40).nullable()
      table.decimal('infill', 3, 2).nullable()
      table.integer('quantity').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.index(['user_id'])
    })
  }

  async down() {
    this.schema.dropTable('cart_items')
  }
}
