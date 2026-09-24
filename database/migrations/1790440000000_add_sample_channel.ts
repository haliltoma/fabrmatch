import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.raw('alter table orders drop constraint if exists orders_channel_check')
    this.schema.raw(
      `alter table orders add constraint orders_channel_check check (channel in ('storefront','shopify','etsy','rfq','direct','sample'))`
    )
  }

  async down() {
    this.schema.raw('alter table orders drop constraint if exists orders_channel_check')
    this.schema.raw(
      `alter table orders add constraint orders_channel_check check (channel in ('storefront','shopify','etsy','rfq','direct'))`
    )
  }
}
