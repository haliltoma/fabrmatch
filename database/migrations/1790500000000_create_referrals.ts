import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('users', (table) => {
      table.string('referral_code', 12).nullable().unique()
    })
    this.schema.alterTable('coupons', (table) => {
      // a personal coupon (referral reward): only this user may use it
      table
        .integer('user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
    })
    this.schema.createTable('referrals', (table) => {
      table.increments('id')
      table
        .integer('referrer_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      // one referrer per new account, ever
      table
        .integer('referee_id')
        .unsigned()
        .notNullable()
        .unique()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.enum('status', ['pending', 'rewarded', 'rejected']).notNullable().defaultTo('pending')
      table.string('reject_reason', 100).nullable()
      table.integer('referee_coupon_id').unsigned().nullable().references('id').inTable('coupons')
      table.integer('referrer_coupon_id').unsigned().nullable().references('id').inTable('coupons')
      table.timestamp('rewarded_at').nullable()
      table.timestamp('created_at').notNullable()
      table.index(['referrer_id'])
    })
  }

  async down() {
    this.schema.dropTable('referrals')
    this.schema.alterTable('coupons', (table) => {
      table.dropColumn('user_id')
    })
    this.schema.alterTable('users', (table) => {
      table.dropColumn('referral_code')
    })
  }
}
