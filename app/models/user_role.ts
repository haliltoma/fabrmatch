import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import User from '#models/user'

export type Role = 'seller' | 'manufacturer' | 'admin'

export default class UserRole extends BaseModel {
  static table = 'user_roles'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare role: Role

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
