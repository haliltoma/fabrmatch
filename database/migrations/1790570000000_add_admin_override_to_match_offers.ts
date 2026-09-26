import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * An admin can send an offer to a maker who does not pass every matching rule (manual mode).
 * Such an offer may be accepted without free capacity, so it has to be told apart.
 */
export default class extends BaseSchema {
  protected tableName = 'match_offers'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.boolean('admin_override').notNullable().defaultTo(false)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('admin_override')
    })
  }
}
