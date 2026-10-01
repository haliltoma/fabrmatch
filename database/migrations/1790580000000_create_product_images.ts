import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Pictures of a model for the shop (R4-T6): server renders (a turntable, one row per angle) and
 * real photos a maker offered from a job's QC photos. A maker photo is shown only after an admin
 * approved it (it could reveal who printed it — business rule 1).
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('product_images', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table
        .uuid('model_file_id')
        .notNullable()
        .references('id')
        .inTable('model_files')
        .onDelete('CASCADE')
      table.string('kind', 20).notNullable() // render | maker_photo
      table.string('status', 20).notNullable() // approved | pending | rejected
      table.string('storage_key', 512).notNullable().unique()
      table.string('content_type', 50).notNullable()
      table.integer('width').nullable()
      table.integer('height').nullable()
      // render: turntable angle in degrees; the version lets a better renderer redo old images
      table.integer('angle').nullable()
      table.integer('render_version').nullable()
      table
        .uuid('qc_photo_id')
        .nullable()
        .references('id')
        .inTable('job_qc_photos')
        .onDelete('SET NULL')
      table.uuid('submitted_by').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.uuid('reviewed_by').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.timestamp('reviewed_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.index(['model_file_id', 'kind', 'status'])
      table.unique(['qc_photo_id'])
    })
  }

  async down() {
    this.schema.dropTable('product_images')
  }
}
