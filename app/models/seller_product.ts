import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import SellerProfile from '#models/seller_profile'
import CatalogProduct from '#models/catalog_product'

export type SellerProductStatus = 'draft' | 'active' | 'archived'

export default class SellerProduct extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare sellerProfileId: number

  @column()
  declare catalogProductId: number | null

  @column()
  declare title: string

  @column()
  declare description: string | null

  @column()
  declare currency: string

  @column()
  declare marginBps: number

  @column()
  declare minMakerTier: number

  @column()
  declare status: SellerProductStatus

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => SellerProfile)
  declare sellerProfile: BelongsTo<typeof SellerProfile>

  @belongsTo(() => CatalogProduct)
  declare catalogProduct: BelongsTo<typeof CatalogProduct>
}
