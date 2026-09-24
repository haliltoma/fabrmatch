import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'user_roles'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.enum('role', ['seller', 'manufacturer', 'admin']).notNullable()
      table.timestamp('created_at').notNullable()

      table.unique(['user_id', 'role'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
