import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('model_files', (table) => {
      table.jsonb('dfm_issues').notNullable().defaultTo('[]')
    })
  }

  async down() {
    this.schema.alterTable('model_files', (table) => {
      table.dropColumn('dfm_issues')
    })
  }
}
