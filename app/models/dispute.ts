import { DisputeSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Order from '#models/order'
import DisputeEvidence from '#models/dispute_evidence'

export type DisputeStatus = 'open' | 'responded' | 'resolved'
export type DisputeResolution = 'full_refund' | 'partial_refund' | 'release' | 'reproduce'

export default class Dispute extends DisputeSchema {
  declare status: DisputeStatus
  declare resolution: DisputeResolution | null

  @belongsTo(() => Order)
  declare order: BelongsTo<typeof Order>

  @hasMany(() => DisputeEvidence)
  declare evidence: HasMany<typeof DisputeEvidence>
}
