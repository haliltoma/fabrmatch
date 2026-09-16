import { ProductionRequestSchema } from '#database/schema'
import Manufacturer from '#models/manufacturer'
import MatchOffer from '#models/match_offer'
import OutboundWebhookEvent from '#models/outbound_webhook_event'
import PayoutInstruction from '#models/payout_instruction'
import type { PrintEstimate } from '#services/contract/types'
import { publicId } from '#services/public_id'
import { beforeCreate, belongsTo, column, hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations'

export const PRODUCTION_STATUSES = [
  'matching_in_progress',
  'awaiting_acceptance',
  'accepted',
  'in_production',
  'quality_check',
  'shipped',
  'delivered',
  'cancelled',
] as const
export type ProductionStatus = (typeof PRODUCTION_STATUSES)[number]

const jsonOrNull = (value: unknown) => (value === null || value === undefined ? null : JSON.stringify(value))

export default class ProductionRequest extends ProductionRequestSchema {
  @column({ prepare: jsonOrNull })
  declare printEstimate: PrintEstimate | null

  @column({ prepare: jsonOrNull })
  declare productionPhotos: string[] | null

  declare status: ProductionStatus

  @belongsTo(() => Manufacturer)
  declare manufacturer: BelongsTo<typeof Manufacturer>

  @hasMany(() => MatchOffer)
  declare matchOffers: HasMany<typeof MatchOffer>

  @hasMany(() => OutboundWebhookEvent)
  declare webhookEvents: HasMany<typeof OutboundWebhookEvent>

  @hasOne(() => PayoutInstruction)
  declare payoutInstruction: HasOne<typeof PayoutInstruction>

  @beforeCreate()
  static assignPublicId(request: ProductionRequest) {
    request.publicId ??= publicId('pr')
  }

  /** Birim başına toplam (parça + destek) gramaj; tahmin yoksa null */
  get unitWeightGrams(): number | null {
    return this.printEstimate ? this.printEstimate.part_weight_g + this.printEstimate.support_weight_g : null
  }
}
