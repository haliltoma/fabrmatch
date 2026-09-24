import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'file_access_grants'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('model_file_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('model_files')
        .onDelete('CASCADE')
      table
        .integer('manufacturer_profile_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('manufacturer_profiles')
        .onDelete('CASCADE')
      table.integer('production_job_id').unsigned().nullable()
      table.timestamp('expires_at').notNullable()
      table.integer('max_downloads').unsigned().notNullable().defaultTo(2)
      table.integer('download_count').unsigned().notNullable().defaultTo(0)

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['model_file_id', 'manufacturer_profile_id'])
    })

    // Download audit log
    this.schema.createTable('file_download_logs', (table) => {
      table.increments('id')
      table
        .integer('grant_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('file_access_grants')
        .onDelete('CASCADE')
      table.integer('manufacturer_profile_id').unsigned().notNullable()
      table.string('ip_address', 45).nullable()
      table.string('user_agent', 512).nullable()
      table.timestamp('created_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable('file_download_logs')
    this.schema.dropTable(this.tableName)
  }
}
