import { MatchOfferSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Order from '#models/order'
import ManufacturerProfile from '#models/manufacturer_profile'

export type MatchOfferStatus = 'pending' | 'accepted' | 'declined' | 'expired'

export default class MatchOffer extends MatchOfferSchema {
  declare status: MatchOfferStatus

  @belongsTo(() => Order)
  declare order: BelongsTo<typeof Order>

  @belongsTo(() => ManufacturerProfile)
  declare manufacturerProfile: BelongsTo<typeof ManufacturerProfile>
}
