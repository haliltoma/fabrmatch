import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Printer from '#models/printer'

export default class CapacitySlot extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare printerId: string

  @column()
  declare date: string

  @column()
  declare maxMinutes: number

  @column()
  declare reservedMinutes: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Printer)
  declare printer: BelongsTo<typeof Printer>

  get availableMinutes(): number {
    return this.maxMinutes - this.reservedMinutes
  }
}
