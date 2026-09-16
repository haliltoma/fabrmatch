import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'production_requests'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      // Sözleşmede dışarı verilen kimlik (pr_...)
      table.string('public_id', 32).notNullable().unique()
      table.string('sistem_a_order_ref').notNullable()
      // Idempotency anahtarı: aynı kalem ikinci kez gelirse yeni talep açılmaz
      table.string('sistem_a_line_item_ref').notNullable().unique()
      table.string('design_reference').notNullable()
      table.string('material', 16).notNullable()
      table.string('color').nullable()
      table.integer('quantity').notNullable()
      table.string('buyer_country', 2).notNullable()
      table.string('buyer_city').nullable()
      table.date('requested_delivery_by').notNullable()
      table.jsonb('print_estimate').nullable()

      table.string('status', 24).notNullable().defaultTo('matching_in_progress')
      table
        .integer('manufacturer_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('manufacturers')
        .onDelete('SET NULL')
      table.double('manufacturer_payout').nullable()
      table.string('currency_code', 3).notNullable().defaultTo('try')
      table.integer('match_attempts').notNullable().defaultTo(0)
      table.string('tracking_number').nullable()
      table.jsonb('production_photos').nullable()

      table.timestamp('accepted_at').nullable()
      table.timestamp('shipped_at').nullable()
      table.timestamp('delivered_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['status'])
      table.index(['manufacturer_id', 'status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
