import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('job_qc_photos', (table) => {
      table.increments('id')
      table
        .integer('production_job_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('production_jobs')
        .onDelete('CASCADE')
      table.string('storage_key', 512).notNullable().unique()
      table.timestamp('created_at').notNullable()
      table.index(['production_job_id'])
    })
  }

  async down() {
    this.schema.dropTable('job_qc_photos')
  }
}
