import { BaseSchema } from '@adonisjs/lucid/schema'
import { DEFAULT_PRICING_REGIONS } from '#services/pricing/pricing_region_defaults'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('pricing_regions', (table) => {
      table.increments('id')
      table.string('code', 16).notNullable().unique()
      table.string('name', 80).notNullable()
      table.string('currency', 3).notNullable()
      table.jsonb('countries').notNullable().defaultTo('[]')
      table.boolean('is_fallback').notNullable().defaultTo(false)
      // base reference price per gram × this / 10 000 (10 000 = same as the base)
      table.integer('reference_multiplier_bps').notNullable().defaultTo(10_000)
      // null = the global commission setting
      table.integer('commission_bps').nullable()
      // TRY minor units; 0 = no minimum
      table.integer('min_order_minor').notNullable().defaultTo(0)
      table.enum('rounding', ['none', 'whole', 'charm99']).notNullable().defaultTo('none')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
    this.schema.raw(
      'create unique index pricing_regions_one_fallback on pricing_regions (is_fallback) where is_fallback'
    )
    this.schema.raw(
      'alter table pricing_regions add constraint pricing_regions_multiplier_positive check (reference_multiplier_bps > 0)'
    )

    this.schema.createTable('pricing_region_materials', (table) => {
      table.increments('id')
      table
        .integer('pricing_region_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('pricing_regions')
        .onDelete('CASCADE')
      table.string('material', 32).notNullable()
      table.integer('price_per_gram_minor').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.unique(['pricing_region_id', 'material'])
    })

    const sqlString = (v: string) => `'${v.replaceAll("'", "''")}'`
    for (const r of DEFAULT_PRICING_REGIONS) {
      this.schema.raw(
        `insert into pricing_regions (code, name, currency, countries, is_fallback, created_at)
         values (${sqlString(r.code)}, ${sqlString(r.name)}, ${sqlString(r.currency)}, ${sqlString(JSON.stringify(r.countries))}::jsonb, ${r.isFallback}, now())`
      )
    }

    // which region's rules priced the order (null for orders placed before regions existed)
    this.schema.table('orders', (table) => {
      table
        .integer('pricing_region_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('pricing_regions')
        .onDelete('SET NULL')
    })
  }

  async down() {
    this.schema.table('orders', (table) => {
      table.dropColumn('pricing_region_id')
    })
    this.schema.dropTable('pricing_region_materials')
    this.schema.dropTable('pricing_regions')
  }
}
