import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'manufacturers'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .unique()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      // Alıcıya/satıcıya görünen anonim kimlik (00: üretici kimliği gizli)
      table.string('public_code', 16).notNullable().unique()
      table.string('display_name').notNullable()
      table.string('country_code', 2).notNullable()
      table.string('city').notNullable()
      table.jsonb('materials').notNullable()
      table.integer('max_build_x_mm').notNullable()
      table.integer('max_build_y_mm').notNullable()
      table.integer('max_build_z_mm').notNullable()
      table.integer('daily_capacity_grams').notNullable()
      table.double('price_per_gram').notNullable()
      table.double('hourly_rate').notNullable()
      table.string('currency_code', 3).notNullable().defaultTo('try')
      table.string('status', 16).notNullable().defaultTo('pending')

      // Reputasyon girdileri (04). null = henüz veri yok → soğuk başlangıç nötr puanı
      table.integer('completed_orders').notNullable().defaultTo(0)
      table.integer('cancelled_orders').notNullable().defaultTo(0)
      table.double('on_time_rate').nullable()
      table.double('quality_score').nullable()
      table.double('avg_response_minutes').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['status', 'country_code'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
