import { MatchOfferSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Order from '#models/order'
import ManufacturerProfile from '#models/manufacturer_profile'
import OfferRevision from '#models/offer_revision'

/**
 * countered: the maker asked for more and waits for an admin (Paket V, V3).
 * revision: the maker asked the buyer to change something and waits for the answer (Paket Y).
 */
export type MatchOfferStatus =
  'pending' | 'countered' | 'revision' | 'accepted' | 'declined' | 'expired'

/** An offer that still holds the order: no other offer goes out meanwhile */
export const OPEN_OFFER_STATUSES: MatchOfferStatus[] = ['pending', 'countered', 'revision']

export default class MatchOffer extends MatchOfferSchema {
  declare status: MatchOfferStatus

  @belongsTo(() => Order)
  declare order: BelongsTo<typeof Order>

  @belongsTo(() => ManufacturerProfile)
  declare manufacturerProfile: BelongsTo<typeof ManufacturerProfile>

  /** Paket Y: the maker's questions to the buyer and the answers, oldest first */
  @hasMany(() => OfferRevision)
  declare revisions: HasMany<typeof OfferRevision>
}
