import { PayoutInstructionSchema } from '#database/schema'
import Manufacturer from '#models/manufacturer'
import ProductionRequest from '#models/production_request'
import { publicId } from '#services/public_id'
import { beforeCreate, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export type PayoutInstructionStatus = 'pending' | 'sent'

export default class PayoutInstruction extends PayoutInstructionSchema {
  declare status: PayoutInstructionStatus

  @belongsTo(() => ProductionRequest)
  declare productionRequest: BelongsTo<typeof ProductionRequest>

  @belongsTo(() => Manufacturer)
  declare manufacturer: BelongsTo<typeof Manufacturer>

  @beforeCreate()
  static assignPublicId(instruction: PayoutInstruction) {
    instruction.publicId ??= publicId('pi')
  }
}
