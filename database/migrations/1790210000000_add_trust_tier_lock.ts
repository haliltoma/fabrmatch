import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('manufacturer_profiles', (table) => {
      // admin pinned the tier (partner status, manual downgrade): the nightly job leaves it alone
      table.boolean('trust_tier_locked').notNullable().defaultTo(false)
    })
  }

  async down() {
    this.schema.alterTable('manufacturer_profiles', (table) => {
      table.dropColumn('trust_tier_locked')
    })
  }
}
