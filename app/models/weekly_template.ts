import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Printer from '#models/printer'

export interface WeeklySchedule {
  [dayOfWeek: string]: number // 0=Sunday..6=Saturday, value = max_minutes
}

export default class WeeklyTemplate extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare printerId: string

  @column({
    prepare: (value: WeeklySchedule) => JSON.stringify(value),
    consume: (value: string | WeeklySchedule) =>
      typeof value === 'string' ? JSON.parse(value) : value,
  })
  declare schedule: WeeklySchedule

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Printer)
  declare printer: BelongsTo<typeof Printer>
}
