import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import User from '#models/user'
import Printer from '#models/printer'

export type ProfileStatus = 'pending' | 'active' | 'suspended'

export default class ManufacturerProfile extends BaseModel {
  static table = 'manufacturer_profiles'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare publicAlias: string

  @column()
  declare city: string | null

  @column()
  declare country: string

  @column()
  declare ibanEnc: string | null

  @column()
  declare taxIdEnc: string | null

  @column()
  declare isCorporate: boolean

  @column()
  declare trustTier: number

  @column()
  declare trustTierLocked: boolean

  @column()
  declare score: number

  @column()
  declare status: ProfileStatus

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @hasMany(() => Printer)
  declare printers: HasMany<typeof Printer>
}
