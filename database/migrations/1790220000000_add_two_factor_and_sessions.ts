import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('users', (table) => {
      table.text('two_factor_secret_enc').nullable()
      table.timestamp('two_factor_enabled_at').nullable()
      // last accepted 30-second step: a code cannot be replayed
      table.bigInteger('two_factor_last_step').nullable()
    })

    this.schema.createTable('two_factor_backup_codes', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.string('code_hash', 64).notNullable()
      table.timestamp('used_at').nullable()
      table.timestamp('created_at').notNullable()
      table.index(['user_id', 'code_hash'])
    })

    this.schema.createTable('user_sessions', (table) => {
      table.uuid('id').primary()
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.string('ip_address', 64).nullable()
      table.string('user_agent', 300).nullable()
      table.timestamp('last_seen_at').notNullable()
      table.timestamp('revoked_at').nullable()
      table.timestamp('created_at').notNullable()
      table.index(['user_id', 'revoked_at'])
    })
  }

  async down() {
    this.schema.dropTable('user_sessions')
    this.schema.dropTable('two_factor_backup_codes')
    this.schema.alterTable('users', (table) => {
      table.dropColumn('two_factor_secret_enc')
      table.dropColumn('two_factor_enabled_at')
      table.dropColumn('two_factor_last_step')
    })
  }
}
