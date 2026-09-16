import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * P0-1: manufacturers.reputation_score — deliver + quality_check olayında hesaplanıp kaydedilir.
 * null → soğuk başlangıç; match_engine neutralQualityFallback (0.5) kullanır.
 */
export default class extends BaseSchema {
  protected tableName = 'manufacturers'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.double('reputation_score').nullable().defaultTo(null)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('reputation_score')
    })
  }
}
