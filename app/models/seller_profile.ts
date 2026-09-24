import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import User from '#models/user'
import SellerProduct from '#models/seller_product'

export type ProfileStatus = 'pending' | 'active' | 'suspended'

export default class SellerProfile extends BaseModel {
  static table = 'seller_profiles'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare businessName: string

  @column()
  declare taxIdEnc: string | null

  @column()
  declare isCorporate: boolean

  @column()
  declare defaultMarginBps: number

  @column()
  declare brandName: string | null

  @column()
  declare brandMessage: string | null

  @column()
  declare status: ProfileStatus

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @hasMany(() => SellerProduct)
  declare products: HasMany<typeof SellerProduct>
}
