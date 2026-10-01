import { BaseSchema } from '@adonisjs/lucid/schema'
import { DEFAULT_SHIPPING_ZONES } from '#services/shipping/shipping_defaults'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('shipping_zones', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table.string('code', 16).notNullable().unique()
      table.string('name', 80).notNullable()
      table.jsonb('countries').notNullable().defaultTo('[]')
      // the zone used for any country no other zone lists
      table.boolean('is_fallback').notNullable().defaultTo(false)
      // price for every started kilogram above the largest tier
      table.integer('extra_per_kg_minor').notNullable().defaultTo(0)
      table.string('currency', 3).notNullable().defaultTo('TRY')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
    this.schema.raw(
      `create unique index shipping_zones_one_fallback on shipping_zones (is_fallback) where is_fallback`
    )

    this.schema.createTable('shipping_rates', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table
        .uuid('zone_id')
        .notNullable()
        .references('id')
        .inTable('shipping_zones')
        .onDelete('CASCADE')
      table.integer('up_to_grams').notNullable()
      table.integer('price_minor').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.unique(['zone_id', 'up_to_grams'])
    })

    const q = (v: string) => `'${v.replaceAll("'", "''")}'`
    for (const zone of DEFAULT_SHIPPING_ZONES) {
      this.schema.raw(
        `insert into shipping_zones (code, name, countries, is_fallback, extra_per_kg_minor, created_at)
         values (${q(zone.code)}, ${q(zone.name)}, ${q(JSON.stringify(zone.countries))}::jsonb, ${zone.isFallback}, ${zone.extraPerKgMinor}, now())`
      )
      for (const [upToGrams, priceMinor] of zone.tiers) {
        this.schema.raw(
          `insert into shipping_rates (zone_id, up_to_grams, price_minor, created_at)
           select id, ${upToGrams}, ${priceMinor}, now() from shipping_zones where code = ${q(zone.code)}`
        )
      }
    }
  }

  async down() {
    this.schema.dropTable('shipping_rates')
    this.schema.dropTable('shipping_zones')
  }
}
