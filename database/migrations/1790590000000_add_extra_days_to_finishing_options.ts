import { BaseSchema } from '@adonisjs/lucid/schema'
import { DEFAULT_FINISHINGS } from '#services/catalog/finishing_defaults'

/** Finishing takes time: days added to the maker's production deadline when the option is chosen. */
export default class extends BaseSchema {
  protected tableName = 'finishing_options'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('extra_days').notNullable().defaultTo(0)
    })
    this.defer(async (db) => {
      // starting values for the seeded options; an admin changes them in /admin/finishing
      for (const [code, , , , , days] of DEFAULT_FINISHINGS) {
        await db.from(this.tableName).where('code', code).update({ extra_days: days })
      }
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('extra_days')
    })
  }
}
