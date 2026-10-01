import { BaseSchema } from '@adonisjs/lucid/schema'
import { DEFAULT_FINISHINGS } from '#services/catalog/finishing_defaults'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('finishing_options', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table.string('code', 32).notNullable().unique()
      table.string('name', 100).notNullable()
      table.string('description', 300).notNullable().defaultTo('')
      // per unit, TRY minor units; it is part of the maker's share, so the platform fee applies to it
      table.integer('price_minor').notNullable()
      // material codes it can be applied to; null = any
      table.jsonb('materials').nullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('created_at').notNullable()
    })
    this.schema.createTable('manufacturer_finishings', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table
        .uuid('manufacturer_profile_id')
        .notNullable()
        .references('id')
        .inTable('manufacturer_profiles')
        .onDelete('CASCADE')
      table
        .uuid('finishing_option_id')
        .notNullable()
        .references('id')
        .inTable('finishing_options')
        .onDelete('CASCADE')
      table.unique(['manufacturer_profile_id', 'finishing_option_id'])
    })
    this.schema.alterTable('order_items', (table) => {
      table.string('finishing_code', 32).nullable()
      // the name as the buyer saw it, so a later rename does not rewrite history
      table.string('finishing_name', 100).nullable()
      // per unit, frozen at pricing time
      table.integer('finishing_minor').notNullable().defaultTo(0)
    })
    this.schema.alterTable('cart_items', (table) => {
      table.string('finishing_code', 32).nullable()
    })
    this.defer(async (db) => {
      for (const [code, name, description, priceMinor, materials] of DEFAULT_FINISHINGS) {
        await db.rawQuery(
          `insert into finishing_options (code, name, description, price_minor, materials, created_at)
           values (?, ?, ?, ?, nullif(?, '')::jsonb, now()) on conflict (code) do nothing`,
          [code, name, description, priceMinor, materials ? JSON.stringify(materials) : '']
        )
      }
    })
  }

  async down() {
    this.schema.alterTable('cart_items', (table) => {
      table.dropColumn('finishing_code')
    })
    this.schema.alterTable('order_items', (table) => {
      table.dropColumn('finishing_minor')
      table.dropColumn('finishing_name')
      table.dropColumn('finishing_code')
    })
    this.schema.dropTable('manufacturer_finishings')
    this.schema.dropTable('finishing_options')
  }
}
