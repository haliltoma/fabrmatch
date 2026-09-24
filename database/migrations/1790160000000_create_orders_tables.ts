import { BaseSchema } from '@adonisjs/lucid/schema'

const ORDER_STATUSES = [
  'draft',
  'awaiting_payment',
  'paid',
  'matching',
  'unmatched',
  'in_production',
  'shipped',
  'delivered',
  'completed',
  'disputed',
  'resolved',
  'cancelled',
]

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('orders', (table) => {
      table.increments('id')
      table.string('code', 16).notNullable().unique()
      table
        .enu('channel', ['storefront', 'shopify', 'etsy', 'rfq', 'direct'])
        .notNullable()
        .defaultTo('direct')
      table
        .integer('buyer_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('RESTRICT')
      table
        .integer('seller_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('RESTRICT')
      table.enu('status', ORDER_STATUSES).notNullable().defaultTo('draft')
      table.string('currency', 3).notNullable().defaultTo('TRY')
      table.integer('subtotal_minor').notNullable().defaultTo(0)
      table.integer('shipping_minor').notNullable().defaultTo(0)
      table.integer('total_minor').notNullable().defaultTo(0)
      table.text('shipping_address_enc').nullable()
      table.string('ship_country', 2).notNullable().defaultTo('TR')
      table.integer('required_trust_tier').notNullable().defaultTo(0)
      table.integer('matching_round').notNullable().defaultTo(0)
      table.timestamp('delivered_at').nullable()
      table.timestamp('completed_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['status'])
      table.index(['buyer_id'])
      table.index(['seller_id'])
    })

    this.schema.createTable('order_items', (table) => {
      table.increments('id')
      table
        .integer('order_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('orders')
        .onDelete('CASCADE')
      table
        .integer('model_file_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('model_files')
        .onDelete('RESTRICT')
      table.string('technology', 8).notNullable().defaultTo('FDM')
      table.string('material', 32).notNullable()
      table.string('color', 32).nullable()
      table.integer('quantity').notNullable().defaultTo(1)
      table.integer('est_grams').notNullable()
      table.integer('est_print_minutes').notNullable()
      table.integer('unit_cost_minor').notNullable()
      table.integer('manufacturer_share_minor').notNullable().defaultTo(0)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.check('?? > 0', ['quantity'], 'order_items_quantity_positive')
    })

    this.schema.createTable('production_jobs', (table) => {
      table.increments('id')
      table
        .integer('order_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('orders')
        .onDelete('CASCADE')
      table
        .integer('manufacturer_profile_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('manufacturer_profiles')
        .onDelete('RESTRICT')
      table
        .integer('printer_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('printers')
        .onDelete('SET NULL')
      table
        .enu('status', ['accepted', 'printing', 'produced', 'shipped', 'delivered', 'cancelled'])
        .notNullable()
        .defaultTo('accepted')
      table.timestamp('accepted_at').notNullable()
      table.timestamp('due_at').notNullable()
      table.timestamp('produced_at').nullable()
      table.timestamp('shipped_at').nullable()
      table.string('tracking_number', 64).nullable()
      table.string('carrier', 64).nullable()
      table.integer('rating').nullable()
      table.text('review_comment').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['manufacturer_profile_id', 'status'])
    })

    // One active production job per order
    this.schema.raw(
      `CREATE UNIQUE INDEX production_jobs_one_active_per_order ON production_jobs (order_id) WHERE status <> 'cancelled'`
    )

    this.schema.createTable('match_offers', (table) => {
      table.increments('id')
      table
        .integer('order_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('orders')
        .onDelete('CASCADE')
      table
        .integer('manufacturer_profile_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('manufacturer_profiles')
        .onDelete('CASCADE')
      table
        .integer('printer_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('printers')
        .onDelete('SET NULL')
      table.date('slot_date').nullable()
      table.integer('round').notNullable()
      table.float('score').notNullable().defaultTo(0)
      table.boolean('is_exploration').notNullable().defaultTo(false)
      table
        .enu('status', ['pending', 'accepted', 'declined', 'expired'])
        .notNullable()
        .defaultTo('pending')
      table.timestamp('expires_at').notNullable()
      table.timestamp('responded_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['order_id', 'round'])
      table.index(['manufacturer_profile_id', 'status'])
    })

    this.schema.createTable('audit_logs', (table) => {
      table.increments('id')
      table
        .integer('actor_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.string('action', 64).notNullable()
      table.string('subject_type', 64).notNullable()
      table.integer('subject_id').notNullable()
      table.jsonb('meta').notNullable().defaultTo('{}')
      table.timestamp('created_at').notNullable()

      table.index(['subject_type', 'subject_id'])
    })
  }

  async down() {
    this.schema.dropTable('audit_logs')
    this.schema.dropTable('match_offers')
    this.schema.dropTable('production_jobs')
    this.schema.dropTable('order_items')
    this.schema.dropTable('orders')
  }
}
