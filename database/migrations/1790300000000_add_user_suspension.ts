import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('users', (table) => {
      table.timestamp('suspended_at').nullable()
      table.string('suspension_reason', 300).nullable()
    })
    this.schema.alterTable('audit_logs', (table) => {
      table.index(['action', 'created_at'])
      table.index(['actor_id'])
    })
  }

  async down() {
    this.schema.alterTable('audit_logs', (table) => {
      table.dropIndex(['action', 'created_at'])
      table.dropIndex(['actor_id'])
    })
    this.schema.alterTable('users', (table) => {
      table.dropColumn('suspended_at')
      table.dropColumn('suspension_reason')
    })
  }
}
