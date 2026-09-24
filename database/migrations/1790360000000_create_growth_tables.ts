import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('leads', (table) => {
      table.increments('id')
      table.string('email', 254).notNullable()
      table.enum('interest', ['maker', 'seller', 'buyer']).notNullable()
      table.string('city', 80).nullable()
      table.string('utm_source', 60).nullable()
      table.string('utm_medium', 60).nullable()
      table.string('utm_campaign', 80).nullable()
      table.string('referrer_host', 120).nullable()
      // explicit, versioned consent to be contacted; a lead without it is never stored
      table.timestamp('consent_at').notNullable()
      table.string('consent_version', 16).notNullable()
      table.timestamp('created_at').notNullable()
    })
    this.schema.raw(
      'create unique index leads_email_interest_unique on leads (lower(email), interest)'
    )

    // anonymous funnel events: no user id, no e-mail, no IP
    this.schema.createTable('marketing_events', (table) => {
      table.increments('id')
      table.string('name', 40).notNullable()
      table.string('source', 60).nullable()
      table.string('medium', 60).nullable()
      table.string('campaign', 80).nullable()
      table.string('path', 120).nullable()
      table.timestamp('created_at').notNullable()
      table.index(['name', 'created_at'])
    })

    this.schema.alterTable('users', (table) => {
      table.string('first_touch_source', 60).nullable()
      table.string('first_touch_medium', 60).nullable()
      table.string('first_touch_campaign', 80).nullable()
    })
  }

  async down() {
    this.schema.alterTable('users', (table) => {
      table.dropColumn('first_touch_source')
      table.dropColumn('first_touch_medium')
      table.dropColumn('first_touch_campaign')
    })
    this.schema.dropTable('marketing_events')
    this.schema.dropTable('leads')
  }
}
