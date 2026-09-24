import { BaseTransformer } from '@adonisjs/core/transformers'
import type MatchOffer from '#models/match_offer'
import OrderTransformer from '#transformers/order_transformer'

export default class MatchOfferTransformer extends BaseTransformer<MatchOffer> {
  toObject() {
    return {
      id: this.resource.id,
      round: this.resource.round,
      status: this.resource.status,
      expiresAt: this.resource.expiresAt.toISO()!,
      slotDate: this.resource.slotDate?.toISODate() ?? null,
      order: OrderTransformer.transform(this.resource.order).useVariant('forOffer'),
    }
  }
}
