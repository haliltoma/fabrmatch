import { BaseTransformer } from '@adonisjs/core/transformers'
import type MatchOffer from '#models/match_offer'
import OrderTransformer from '#transformers/order_transformer'
import { convertMinor } from '#services/pricing/fx'

export default class MatchOfferTransformer extends BaseTransformer<MatchOffer> {
  toObject() {
    const offer = this.resource
    const order = offer.order
    // Paket V: the maker's own price for the order (TRY) in the order's currency; older offers and
    // admin overrides pay the order's maker share
    const payMinor =
      offer.makerPayMinor === null
        ? null
        : order.fxRateNano === null
          ? offer.makerPayMinor
          : convertMinor(offer.makerPayMinor, BigInt(order.fxRateNano))
    return {
      id: this.resource.id,
      round: this.resource.round,
      status: this.resource.status,
      expiresAt: this.resource.expiresAt.toISO()!,
      slotDate: this.resource.slotDate?.toISODate() ?? null,
      payMinor,
      order: OrderTransformer.transform(this.resource.order).useVariant('forOffer'),
    }
  }
}
