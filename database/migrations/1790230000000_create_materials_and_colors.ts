import { BaseSchema } from '@adonisjs/lucid/schema'
import { DEFAULT_COLORS, DEFAULT_MATERIALS } from '#services/catalog/reference_defaults'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('materials', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table.string('code', 32).notNullable().unique()
      table.string('name', 80).notNullable()
      table.enum('technology', ['FDM', 'SLA', 'SLS']).notNullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
    this.schema.createTable('colors', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table.string('name', 40).notNullable()
      table.string('hex', 7).notNullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
    this.schema.raw('create unique index colors_name_lower_unique on colors (lower(name))')

    const sqlString = (v: string) => `'${v.replaceAll("'", "''")}'`
    for (const [code, name, technology] of DEFAULT_MATERIALS) {
      this.schema.raw(
        `insert into materials (code, name, technology, created_at) values (${sqlString(code)}, ${sqlString(name)}, ${sqlString(technology)}, now())`
      )
    }
    for (const [name, hex] of DEFAULT_COLORS) {
      this.schema.raw(
        `insert into colors (name, hex, created_at) values (${sqlString(name)}, ${sqlString(hex)}, now())`
      )
    }

    // carry over whatever makers already typed, so nothing they offer disappears
    this.schema.raw(`
      insert into materials (code, name, technology, created_at)
      select distinct on (upper(trim(pm.material))) upper(trim(pm.material)), upper(trim(pm.material)), p.technology, now()
        from printer_materials pm join printers p on p.id = pm.printer_id
       order by upper(trim(pm.material)), p.id
      on conflict (code) do nothing`)
    this.schema.raw(`update printer_materials set material = upper(trim(material))`)
    this.schema.raw(`
      insert into colors (name, hex, created_at)
      select distinct initcap(trim(c)), '#9CA3AF', now()
        from printer_materials pm, jsonb_array_elements_text(pm.colors::jsonb) c
       where trim(c) <> ''
      on conflict do nothing`)
    this.schema.raw(`
      update printer_materials pm set colors = (
        select coalesce(jsonb_agg(distinct initcap(trim(c))), '[]'::jsonb)
          from jsonb_array_elements_text(pm.colors::jsonb) c where trim(c) <> '')`)
  }

  async down() {
    this.schema.dropTable('colors')
    this.schema.dropTable('materials')
  }
}
