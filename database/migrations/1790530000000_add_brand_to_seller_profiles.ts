import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('seller_profiles', (table) => {
      // printed on the packing slip that goes in the parcel instead of our name (white label)
      table.string('brand_name', 60).nullable()
      table.string('brand_message', 240).nullable()
    })
  }

  async down() {
    this.schema.alterTable('seller_profiles', (table) => {
      table.dropColumn('brand_message')
      table.dropColumn('brand_name')
    })
  }
}
