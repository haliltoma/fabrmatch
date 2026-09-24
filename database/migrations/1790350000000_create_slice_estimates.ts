import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('slice_estimates', (table) => {
      table.increments('id')
      // same model bytes + same profile → same answer, so it is computed once
      table.string('content_hash', 64).notNullable()
      table.string('profile_code', 32).notNullable()
      table.enum('status', ['done', 'failed']).notNullable()
      table.integer('grams_centi').nullable()
      table.integer('support_grams_centi').nullable()
      table.integer('print_minutes').nullable()
      table.string('slicer', 60).nullable()
      table.string('error', 300).nullable()
      table.timestamp('created_at').notNullable()
      table.unique(['content_hash', 'profile_code'])
    })
  }

  async down() {
    this.schema.dropTable('slice_estimates')
  }
}
