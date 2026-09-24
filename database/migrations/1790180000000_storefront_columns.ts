import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // The analyzed model behind a catalog product; storefront orders are produced from it.
    this.schema.alterTable('catalog_products', (table) => {
      table
        .integer('model_file_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('model_files')
        .onDelete('SET NULL')
    })

    // Storefront search (PRD §Faz 6): full-text, title weighted above description.
    this.schema.raw(`
      alter table seller_products add column search_vector tsvector
        generated always as (
          setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
          setweight(to_tsvector('simple', coalesce(description, '')), 'B')
        ) stored
    `)
    this.schema.raw(
      'create index seller_products_search_idx on seller_products using gin (search_vector)'
    )
  }

  async down() {
    this.schema.raw('drop index if exists seller_products_search_idx')
    this.schema.alterTable('seller_products', (table) => {
      table.dropColumn('search_vector')
    })
    this.schema.alterTable('catalog_products', (table) => {
      table.dropColumn('model_file_id')
    })
  }
}
