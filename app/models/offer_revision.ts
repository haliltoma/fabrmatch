import { OfferRevisionSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import MatchOffer from '#models/match_offer'

/** a maker may ask this many times per offer; then it is accept or decline */
export const MAX_REVISIONS = 3

/** open: the buyer has to answer; answered: back with the maker; lapsed: nobody answered in time */
export type OfferRevisionStatus = 'open' | 'answered' | 'lapsed'

/** A maker asked the buyer to change something before accepting (Paket Y). Texts are moderated. */
export default class OfferRevision extends OfferRevisionSchema {
  declare status: OfferRevisionStatus

  @belongsTo(() => MatchOffer)
  declare matchOffer: BelongsTo<typeof MatchOffer>
}
