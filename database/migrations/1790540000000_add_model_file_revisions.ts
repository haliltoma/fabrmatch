import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('model_files', (table) => {
      // a new revision of the same model points at the one it replaces
      table
        .integer('previous_file_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('model_files')
        .onDelete('SET NULL')
      table.integer('revision').notNullable().defaultTo(1)
      table.index(['previous_file_id'])
    })
  }

  async down() {
    this.schema.alterTable('model_files', (table) => {
      table.dropColumn('revision')
      table.dropColumn('previous_file_id')
    })
  }
}
