import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'model_files'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('owner_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.string('storage_key', 512).notNullable().unique()
      table.string('original_name', 255).notNullable()
      table.enum('format', ['STL', '3MF', 'OBJ']).notNullable()
      table.bigInteger('size_bytes').unsigned().notNullable()
      table.string('sha256', 64).notNullable()
      table.float('volume_mm3').nullable()
      table.float('bbox_x_mm').nullable()
      table.float('bbox_y_mm').nullable()
      table.float('bbox_z_mm').nullable()
      table.integer('triangle_count').unsigned().nullable()
      table
        .enum('analysis_status', ['pending', 'processing', 'done', 'failed'])
        .notNullable()
        .defaultTo('pending')
      table.boolean('is_printable').nullable()
      table.text('analysis_error').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['sha256'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
