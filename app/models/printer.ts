import { BaseModel, column, belongsTo, hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import ManufacturerProfile from '#models/manufacturer_profile'
import PrinterMaterial from '#models/printer_material'
import CapacitySlot from '#models/capacity_slot'
import WeeklyTemplate from '#models/weekly_template'

export type PrinterTechnology = 'FDM' | 'SLA' | 'SLS'

export default class Printer extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare manufacturerProfileId: number

  @column()
  declare name: string

  @column()
  declare technology: PrinterTechnology

  @column()
  declare buildVolumeXMm: number

  @column()
  declare buildVolumeYMm: number

  @column()
  declare buildVolumeZMm: number

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => ManufacturerProfile)
  declare manufacturerProfile: BelongsTo<typeof ManufacturerProfile>

  @hasMany(() => PrinterMaterial)
  declare materials: HasMany<typeof PrinterMaterial>

  @hasMany(() => CapacitySlot)
  declare capacitySlots: HasMany<typeof CapacitySlot>

  @hasOne(() => WeeklyTemplate)
  declare weeklyTemplate: HasOne<typeof WeeklyTemplate>

  get buildVolumeMm3(): number {
    return this.buildVolumeXMm * this.buildVolumeYMm * this.buildVolumeZMm
  }
}
