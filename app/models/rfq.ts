import { RfqSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import ModelFile from '#models/model_file'
import RfqBid from '#models/rfq_bid'

export default class Rfq extends RfqSchema {
  declare status: 'open' | 'closed' | 'awarded' | 'cancelled' | 'expired'

  @belongsTo(() => ModelFile)
  declare modelFile: BelongsTo<typeof ModelFile>

  @hasMany(() => RfqBid)
  declare bids: HasMany<typeof RfqBid>
}
