import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'seller_profiles'

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
        .unique()
      table.string('business_name', 255).notNullable()
      table.text('tax_id_enc').nullable()
      table.boolean('is_corporate').notNullable().defaultTo(false)
      table.integer('default_margin_bps').notNullable().defaultTo(2000)
      table.enum('status', ['pending', 'active', 'suspended']).notNullable().defaultTo('pending')

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
