import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('coupons', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table.string('code', 40).notNullable().unique()
      table.enum('kind', ['percent', 'fixed']).notNullable()
      // percent: basis points (1000 = 10%); fixed: TRY minor units (converted for other currencies)
      table.integer('value').notNullable()
      table.integer('min_order_minor').notNullable().defaultTo(0)
      table.integer('max_discount_minor').nullable()
      table.integer('max_redemptions').nullable()
      table.integer('per_user_limit').notNullable().defaultTo(1)
      table.boolean('first_order_only').notNullable().defaultTo(false)
      table.timestamp('starts_at').nullable()
      table.timestamp('ends_at').nullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.string('note', 200).nullable()
      table.timestamp('created_at').notNullable()
    })
    this.schema.createTable('coupon_redemptions', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table.uuid('coupon_id').notNullable().references('id').inTable('coupons')
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table
        .uuid('order_id')
        .notNullable()
        .unique()
        .references('id')
        .inTable('orders')
        .onDelete('CASCADE')
      table.integer('discount_minor').notNullable()
      table.timestamp('created_at').notNullable()
      table.index(['coupon_id'])
      table.index(['user_id'])
    })
    this.schema.alterTable('orders', (table) => {
      // funded from the platform's own commission: maker and seller shares never change
      table.integer('discount_minor').notNullable().defaultTo(0)
    })
  }

  async down() {
    this.schema.alterTable('orders', (table) => {
      table.dropColumn('discount_minor')
    })
    this.schema.dropTable('coupon_redemptions')
    this.schema.dropTable('coupons')
  }
}
