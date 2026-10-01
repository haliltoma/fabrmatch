import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('users', (table) => {
      table.string('referral_code', 12).nullable().unique()
    })
    this.schema.alterTable('coupons', (table) => {
      // a personal coupon (referral reward): only this user may use it
      table.uuid('user_id').nullable().references('id').inTable('users').onDelete('CASCADE')
    })
    this.schema.createTable('referrals', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table.uuid('referrer_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      // one referrer per new account, ever
      table
        .uuid('referee_id')
        .notNullable()
        .unique()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.enum('status', ['pending', 'rewarded', 'rejected']).notNullable().defaultTo('pending')
      table.string('reject_reason', 100).nullable()
      table.uuid('referee_coupon_id').nullable().references('id').inTable('coupons')
      table.uuid('referrer_coupon_id').nullable().references('id').inTable('coupons')
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
