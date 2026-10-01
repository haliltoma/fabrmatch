import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('model_files', (table) => {
      table.timestamp('blocked_at').nullable()
      table.string('blocked_reason', 300).nullable()
    })

    this.schema.createTable('content_reports', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table.uuid('reporter_id').notNullable().references('id').inTable('users')
      table
        .uuid('model_file_id')
        .nullable()
        .references('id')
        .inTable('model_files')
        .onDelete('CASCADE')
      table
        .uuid('seller_product_id')
        .nullable()
        .references('id')
        .inTable('seller_products')
        .onDelete('CASCADE')
      table.enum('reason', ['weapon', 'copyright', 'unsafe', 'other']).notNullable()
      table.string('details', 500).nullable()
      table.enum('status', ['open', 'actioned', 'dismissed']).notNullable().defaultTo('open')
      table.uuid('resolved_by').nullable().references('id').inTable('users')
      table.timestamp('resolved_at').nullable()
      table.timestamp('created_at').notNullable()
      table.index(['status'])
    })
    this.schema.raw(
      `alter table content_reports add constraint content_reports_one_target check ((model_file_id is not null) <> (seller_product_id is not null))`
    )
  }

  async down() {
    this.schema.dropTable('content_reports')
    this.schema.alterTable('model_files', (table) => {
      table.dropColumn('blocked_at')
      table.dropColumn('blocked_reason')
    })
  }
}
