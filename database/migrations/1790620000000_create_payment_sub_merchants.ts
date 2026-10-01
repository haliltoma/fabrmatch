import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * iyzico (R1-T1).
 * - payment_sub_merchants: the sub-merchant key iyzico gave each maker/seller (marketplace).
 * - payment_provider_calls: money-moving calls (refund, approve) keyed by our idempotency key.
 *   iyzico has no idempotency key of its own, so a retry must never reach it twice.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('payment_sub_merchants', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table.string('provider', 32).notNullable()
      table.string('beneficiary_type', 16).notNullable()
      table.uuid('beneficiary_id').notNullable()
      table.string('sub_merchant_key', 128).notNullable()
      table.timestamp('created_at').notNullable()
      table.unique(['provider', 'beneficiary_type', 'beneficiary_id'])
    })
    this.schema.createTable('payment_provider_calls', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table.string('provider', 32).notNullable()
      table.string('idempotency_key', 191).notNullable()
      table.string('result_ref', 191).nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('completed_at').nullable()
      table.unique(['provider', 'idempotency_key'])
    })
  }

  async down() {
    this.schema.dropTable('payment_provider_calls')
    this.schema.dropTable('payment_sub_merchants')
  }
}
