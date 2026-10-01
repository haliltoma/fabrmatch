import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'verification_tokens'

  async up() {
    // Add email_verified_at to users
    this.schema.alterTable('users', (table) => {
      table.timestamp('email_verified_at').nullable()
    })

    // Token table for email verification + password reset
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.enum('type', ['email_verification', 'password_reset']).notNullable()
      table.string('token', 64).notNullable().unique()
      table.timestamp('expires_at').notNullable()
      table.timestamp('used_at').nullable()
      table.timestamp('created_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
    this.schema.alterTable('users', (table) => {
      table.dropColumn('email_verified_at')
    })
  }
}
