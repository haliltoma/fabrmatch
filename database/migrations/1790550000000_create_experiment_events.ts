import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('experiment_events', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table.string('experiment', 60).notNullable()
      table.string('variant', 20).notNullable()
      table.enum('event', ['exposure', 'conversion']).notNullable()
      // keyed hash of the session: enough to count a visitor once, useless for finding them
      table.string('visitor_hash', 64).notNullable()
      table.timestamp('created_at').notNullable()
      table.unique(['experiment', 'visitor_hash', 'event'])
      table.index(['experiment', 'variant', 'event'])
    })
  }

  async down() {
    this.schema.dropTable('experiment_events')
  }
}
