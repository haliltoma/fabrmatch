import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Printer from '#models/printer'

export default class PrinterMaterial extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare printerId: string

  @column()
  declare material: string

  @column({
    prepare: (value: string[]) => JSON.stringify(value),
    consume: (value: string | string[]) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare colors: string[]

  @column()
  /** what the maker pays for this material, per kilogram (Paket V) */
  declare materialCostPerKgMinor: number

  @column()
  declare currency: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Printer)
  declare printer: BelongsTo<typeof Printer>
}
