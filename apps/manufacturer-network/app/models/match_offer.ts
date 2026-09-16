import { MatchOfferSchema } from '#database/schema'
import Manufacturer from '#models/manufacturer'
import ProductionRequest from '#models/production_request'
import type { ScoreBreakdown } from '#services/matching/match_engine'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export type MatchOfferStatus = 'offered' | 'accepted' | 'declined' | 'expired'
export type SelectionReason = 'score' | 'exploration' | 'protection'

export default class MatchOffer extends MatchOfferSchema {
  @column({ prepare: (value: ScoreBreakdown) => JSON.stringify(value) })
  declare scoreBreakdown: ScoreBreakdown

  declare status: MatchOfferStatus
  declare selectionReason: SelectionReason

  @belongsTo(() => ProductionRequest)
  declare productionRequest: BelongsTo<typeof ProductionRequest>

  @belongsTo(() => Manufacturer)
  declare manufacturer: BelongsTo<typeof Manufacturer>
}
