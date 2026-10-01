import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('consents', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.enum('kind', ['terms', 'privacy', 'marketing_email']).notNullable()
      // which wording was shown; the text itself lives in the legal pages (D5)
      table.string('version', 16).notNullable()
      table.boolean('granted').notNullable()
      table.timestamp('created_at').notNullable()
      table.index(['user_id', 'kind', 'id'])
    })
  }

  async down() {
    this.schema.dropTable('consents')
  }
}
