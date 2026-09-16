import { BaseSchema } from '@adonisjs/lucid/schema'

/** 05-PRD: Sistem A üreticiye Stripe Connect üzerinden ödemeyi bu kimlikle gönderir. */
export default class extends BaseSchema {
  protected tableName = 'manufacturers'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('stripe_account_id').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('stripe_account_id')
    })
  }
}
