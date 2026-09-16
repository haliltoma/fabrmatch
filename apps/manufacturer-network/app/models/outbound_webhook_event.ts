import { OutboundWebhookEventSchema } from '#database/schema'
import ProductionRequest from '#models/production_request'
import type { ProductionStatusWebhookPayload, WebhookStatus } from '#services/contract/types'
import { publicId } from '#services/public_id'
import { beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export type DeliveryState = 'pending' | 'delivered' | 'failed'

export default class OutboundWebhookEvent extends OutboundWebhookEventSchema {
  @column({ prepare: (value: ProductionStatusWebhookPayload) => JSON.stringify(value) })
  declare payload: ProductionStatusWebhookPayload

  declare status: WebhookStatus
  declare state: DeliveryState

  @belongsTo(() => ProductionRequest)
  declare productionRequest: BelongsTo<typeof ProductionRequest>

  @beforeCreate()
  static assignPublicId(event: OutboundWebhookEvent) {
    event.publicId ??= publicId('evt')
  }
}
