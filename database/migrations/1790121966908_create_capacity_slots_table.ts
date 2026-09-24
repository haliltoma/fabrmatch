import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'capacity_slots'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('printer_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('printers')
        .onDelete('CASCADE')
      table.date('date').notNullable()
      table.integer('max_minutes').unsigned().notNullable()
      table.integer('reserved_minutes').unsigned().notNullable().defaultTo(0)

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['printer_id', 'date'])
    })

    // Check constraint: reserved cannot exceed max
    this.schema.raw(
      'ALTER TABLE capacity_slots ADD CONSTRAINT check_reserved_within_max CHECK (reserved_minutes <= max_minutes)'
    )
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
