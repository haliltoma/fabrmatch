import { BaseSchema } from '@adonisjs/lucid/schema'
import { DEFAULT_PRINT_PROFILES } from '#services/catalog/print_profile_defaults'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('print_profiles', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table.string('code', 32).notNullable().unique()
      table.string('name', 100).notNullable()
      table.enum('technology', ['FDM', 'SLA', 'SLS']).notNullable()
      table.integer('layer_height_micron').notNullable()
      table.integer('infill_percent').notNullable()
      table.integer('time_factor_bps').notNullable().defaultTo(10000)
      table.string('post_process', 120).nullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    this.schema.createTable('printer_print_profiles', (table) => {
      table
        .uuid('printer_id')
        .notNullable()
        .references('id')
        .inTable('printers')
        .onDelete('CASCADE')
      table
        .uuid('print_profile_id')
        .notNullable()
        .references('id')
        .inTable('print_profiles')
        .onDelete('CASCADE')
      table.primary(['printer_id', 'print_profile_id'])
    })

    this.schema.alterTable('order_items', (table) => {
      table
        .uuid('print_profile_id')
        .nullable()
        .references('id')
        .inTable('print_profiles')
        .onDelete('SET NULL')
    })

    const q = (v: string | null) => (v === null ? 'null' : `'${v.replaceAll("'", "''")}'`)
    for (const p of DEFAULT_PRINT_PROFILES) {
      this.schema.raw(
        `insert into print_profiles (code, name, technology, layer_height_micron, infill_percent, time_factor_bps, post_process, created_at)
         values (${q(p.code)}, ${q(p.name)}, ${q(p.technology)}, ${p.layerHeightMicron}, ${p.infillPercent}, ${p.timeFactorBps}, ${q(p.postProcess)}, now())`
      )
    }
    // existing printers keep receiving every order of their technology
    this.schema.raw(
      `insert into printer_print_profiles (printer_id, print_profile_id)
       select p.id, pp.id from printers p join print_profiles pp on pp.technology = p.technology`
    )
  }

  async down() {
    this.schema.alterTable('order_items', (table) => {
      table.dropColumn('print_profile_id')
    })
    this.schema.dropTable('printer_print_profiles')
    this.schema.dropTable('print_profiles')
  }
}
