import { BaseSchema } from '@adonisjs/lucid/schema'

/** Which capacity slot a job holds and for how long, so cancelling or reassigning frees it. */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('production_jobs', (table) => {
      table
        .uuid('capacity_slot_id')
        .nullable()
        .references('id')
        .inTable('capacity_slots')
        .onDelete('SET NULL')
      table.integer('reserved_minutes').nullable()
    })
  }

  async down() {
    this.schema.alterTable('production_jobs', (table) => {
      table.dropColumn('capacity_slot_id')
      table.dropColumn('reserved_minutes')
    })
  }
}
