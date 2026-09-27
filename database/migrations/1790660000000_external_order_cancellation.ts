import { BaseSchema } from '@adonisjs/lucid/schema'

/** The shop cancelled the order: cancelled here too, or noted when production already started. */
export default class extends BaseSchema {
  async up() {
    this.schema.raw('alter table external_orders drop constraint external_orders_status_check')
    this.schema.raw(
      `alter table external_orders add constraint external_orders_status_check
         check (status in ('needs_mapping', 'placed', 'ignored', 'failed', 'cancelled'))`
    )
    this.schema.alterTable('external_orders', (table) => {
      table.timestamp('shop_cancelled_at').nullable()
    })
  }

  async down() {
    this.schema.alterTable('external_orders', (table) => table.dropColumn('shop_cancelled_at'))
    this.schema.raw('alter table external_orders drop constraint external_orders_status_check')
    this.schema.raw(
      `alter table external_orders add constraint external_orders_status_check
         check (status in ('needs_mapping', 'placed', 'ignored', 'failed'))`
    )
  }
}
