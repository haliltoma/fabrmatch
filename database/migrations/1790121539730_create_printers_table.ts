import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'printers'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('manufacturer_profile_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('manufacturer_profiles')
        .onDelete('CASCADE')
      table.string('name', 100).notNullable()
      table.enum('technology', ['FDM', 'SLA', 'SLS']).notNullable()
      table.integer('build_volume_x_mm').unsigned().notNullable()
      table.integer('build_volume_y_mm').unsigned().notNullable()
      table.integer('build_volume_z_mm').unsigned().notNullable()
      table.boolean('is_active').notNullable().defaultTo(true)

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
