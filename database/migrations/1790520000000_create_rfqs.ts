import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('rfqs', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table.string('code', 20).notNullable().unique()
      table.uuid('buyer_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.uuid('model_file_id').notNullable().references('id').inTable('model_files')
      table.string('title', 120).notNullable()
      table.string('material', 32).notNullable()
      table.string('color', 40).nullable()
      table.string('technology', 8).notNullable()
      table.integer('quantity').notNullable()
      table.string('ship_country', 2).notNullable()
      // makers can bid until then
      table.timestamp('bids_close_at').notNullable()
      // the buyer wants the parts within this many days of accepting
      table.integer('max_lead_days').notNullable()
      table.integer('required_trust_tier').notNullable().defaultTo(0)
      table
        .enum('status', ['open', 'closed', 'awarded', 'cancelled', 'expired'])
        .notNullable()
        .defaultTo('open')
      table.uuid('awarded_bid_id').nullable()
      table.uuid('order_id').nullable().references('id').inTable('orders')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.index(['buyer_id'])
      table.index(['status', 'bids_close_at'])
    })
    this.schema.createTable('rfq_invites', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table.uuid('rfq_id').notNullable().references('id').inTable('rfqs').onDelete('CASCADE')
      table
        .uuid('manufacturer_profile_id')
        .notNullable()
        .references('id')
        .inTable('manufacturer_profiles')
        .onDelete('CASCADE')
      // true for the invite that came from the new-maker discovery quota
      table.boolean('is_exploration').notNullable().defaultTo(false)
      table.timestamp('created_at').notNullable()
      table.unique(['rfq_id', 'manufacturer_profile_id'])
      table.index(['manufacturer_profile_id'])
    })
    this.schema.createTable('rfq_bids', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table.uuid('rfq_id').notNullable().references('id').inTable('rfqs').onDelete('CASCADE')
      table
        .uuid('manufacturer_profile_id')
        .notNullable()
        .references('id')
        .inTable('manufacturer_profiles')
        .onDelete('CASCADE')
      // what the maker wants per unit (TRY minor); the platform fee and shipping are added on top
      table.integer('unit_price_minor').notNullable()
      table.integer('lead_days').notNullable()
      table.string('note', 300).nullable()
      table.enum('status', ['active', 'withdrawn', 'won', 'lost']).notNullable().defaultTo('active')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.unique(['rfq_id', 'manufacturer_profile_id'])
    })
    this.schema.alterTable('rfqs', (table) => {
      table.foreign('awarded_bid_id').references('id').inTable('rfq_bids')
    })
  }

  async down() {
    this.schema.alterTable('rfqs', (table) => {
      table.dropForeign('awarded_bid_id')
    })
    this.schema.dropTable('rfq_bids')
    this.schema.dropTable('rfq_invites')
    this.schema.dropTable('rfqs')
  }
}
