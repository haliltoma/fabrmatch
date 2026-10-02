import { MatchOfferSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Order from '#models/order'
import ManufacturerProfile from '#models/manufacturer_profile'

/** countered: the maker asked for more and waits for an admin (Paket V, V3) */
export type MatchOfferStatus = 'pending' | 'countered' | 'accepted' | 'declined' | 'expired'

/** An offer that still holds the order: no other offer goes out meanwhile */
export const OPEN_OFFER_STATUSES: MatchOfferStatus[] = ['pending', 'countered']

export default class MatchOffer extends MatchOfferSchema {
  declare status: MatchOfferStatus

  @belongsTo(() => Order)
  declare order: BelongsTo<typeof Order>

  @belongsTo(() => ManufacturerProfile)
  declare manufacturerProfile: BelongsTo<typeof ManufacturerProfile>
}
