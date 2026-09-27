import { BaseSchema } from '@adonisjs/lucid/schema'
import { DEFAULT_PRINTER_MODELS } from '#services/manufacturing/printer_model_defaults'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('printer_models', (table) => {
      table.increments('id')
      table.string('brand', 60).notNullable()
      table.string('model', 80).notNullable()
      table.enum('technology', ['FDM', 'SLA', 'SLS']).notNullable()
      table.integer('build_volume_x_mm').unsigned().notNullable()
      table.integer('build_volume_y_mm').unsigned().notNullable()
      table.integer('build_volume_z_mm').unsigned().notNullable()
      table.boolean('enclosed').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.unique(['brand', 'model'])
    })

    const sqlString = (v: string) => `'${v.replaceAll("'", "''")}'`
    for (const m of DEFAULT_PRINTER_MODELS) {
      this.schema.raw(
        `insert into printer_models (brand, model, technology, build_volume_x_mm, build_volume_y_mm, build_volume_z_mm, enclosed, created_at)
         values (${sqlString(m.brand)}, ${sqlString(m.model)}, '${m.technology}', ${m.build[0]}, ${m.build[1]}, ${m.build[2]}, ${m.enclosed}, now())`
      )
    }

    // makers keep free-text machines: the link is optional
    this.schema.table('printers', (table) => {
      table
        .integer('printer_model_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('printer_models')
        .onDelete('SET NULL')
    })
  }

  async down() {
    this.schema.table('printers', (table) => {
      table.dropColumn('printer_model_id')
    })
    this.schema.dropTable('printer_models')
  }
}
