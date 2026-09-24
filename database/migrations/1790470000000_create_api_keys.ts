import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('api_keys', (table) => {
      table.increments('id')
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.string('name', 80).notNullable()
      // first characters of the key, shown in the list so a seller can tell keys apart
      table.string('prefix', 16).notNullable()
      // sha256 of the full key: keys are high-entropy random strings, so a plain hash is enough
      table.string('key_hash', 64).notNullable().unique()
      table.timestamp('last_used_at').nullable()
      table.timestamp('revoked_at').nullable()
      table.timestamp('created_at').notNullable()
      table.index(['user_id'])
    })
  }

  async down() {
    this.schema.dropTable('api_keys')
  }
}
