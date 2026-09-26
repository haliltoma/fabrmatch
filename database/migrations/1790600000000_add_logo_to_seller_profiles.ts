import { BaseSchema } from '@adonisjs/lucid/schema'

/** The seller's logo for the packing card (R4-T13): a private file, PNG/JPEG/WebP only. */
export default class extends BaseSchema {
  protected tableName = 'seller_profiles'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('logo_key', 512).nullable()
      table.string('logo_content_type', 50).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('logo_key')
      table.dropColumn('logo_content_type')
    })
  }
}
