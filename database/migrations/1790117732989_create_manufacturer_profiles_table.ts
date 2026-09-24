import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'manufacturer_profiles'

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
      table.string('public_alias', 20).notNullable().unique()
      table.string('city', 100).nullable()
      table.string('country', 2).notNullable().defaultTo('TR')
      table.text('iban_enc').nullable()
      table.text('tax_id_enc').nullable()
      table.boolean('is_corporate').notNullable().defaultTo(false)
      table.integer('trust_tier').notNullable().defaultTo(0)
      table.integer('score').notNullable().defaultTo(0)
      table.enum('status', ['pending', 'active', 'suspended']).notNullable().defaultTo('pending')

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
