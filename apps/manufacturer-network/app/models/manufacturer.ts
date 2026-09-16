import { ManufacturerSchema } from '#database/schema'
import MatchOffer from '#models/match_offer'
import ProductionRequest from '#models/production_request'
import User from '#models/user'
import { belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

export const MANUFACTURER_STATUSES = ['pending', 'active', 'suspended'] as const
export type ManufacturerStatus = (typeof MANUFACTURER_STATUSES)[number]

export default class Manufacturer extends ManufacturerSchema {
  // pg sürücüsü JS dizisini jsonb değil Postgres dizisi olarak yazar; açıkça JSON'a çevrilir
  @column({ prepare: (value: string[]) => JSON.stringify(value) })
  declare materials: string[]

  declare status: ManufacturerStatus
  declare stripeAccountId: string | null

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @hasMany(() => ProductionRequest)
  declare productionRequests: HasMany<typeof ProductionRequest>

  @hasMany(() => MatchOffer)
  declare matchOffers: HasMany<typeof MatchOffer>
}
