import { BaseSchema } from '@adonisjs/lucid/schema'

/** Etsy (R4-T5): OAuth refresh token and the polling cursor (Etsy has no order webhooks). */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('store_connections', (table) => {
      table.text('refresh_token_enc').nullable()
      table.timestamp('orders_polled_at').nullable()
    })
  }

  async down() {
    this.schema.alterTable('store_connections', (table) => {
      table.dropColumn('refresh_token_enc')
      table.dropColumn('orders_polled_at')
    })
  }
}
