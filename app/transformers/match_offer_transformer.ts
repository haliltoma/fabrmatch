import { BaseTransformer } from '@adonisjs/core/transformers'
import type MatchOffer from '#models/match_offer'
import OrderTransformer from '#transformers/order_transformer'
import { convertMinor } from '#services/pricing/fx'
import fabrmatchConfig from '#config/fabrmatch'
import { MAX_REVISIONS } from '#models/offer_revision'

export default class MatchOfferTransformer extends BaseTransformer<MatchOffer> {
  toObject() {
    const offer = this.resource
    const order = offer.order
    // Paket V: the maker's own price for the order (TRY) in the order's currency; older offers and
    // admin overrides pay the order's maker share
    const inOrderCurrency = (minor: number | null) =>
      minor === null
        ? null
        : order.fxRateNano === null
          ? minor
          : convertMinor(minor, BigInt(order.fxRateNano))
    const payMinor = inOrderCurrency(offer.makerPayMinor)
    // V3: a market-priced offer can be countered up to what the order pays makers
    const canCounter =
      fabrmatchConfig.matching.counterOffers === 1 &&
      offer.status === 'pending' &&
      offer.makerPayMinor !== null &&
      order.makerBudgetMinor !== null &&
      order.makerBudgetMinor > offer.makerPayMinor
    return {
      id: this.resource.id,
      round: this.resource.round,
      status: this.resource.status,
      expiresAt: this.resource.expiresAt.toISO()!,
      slotDate: this.resource.slotDate?.toISODate() ?? null,
      payMinor,
      counterPayMinor: inOrderCurrency(offer.counterPayMinor),
      maxAskMinor: canCounter ? inOrderCurrency(order.makerBudgetMinor) : null,
      // Paket Y: questions to the buyer (moderated texts only, no names on either side)
      revisions: (offer.revisions ?? []).map((r) => ({
        id: r.id,
        status: r.status,
        request: r.requestBody,
        response: r.responseBody,
        askedAt: r.createdAt.toISO()!,
        answeredAt: r.answeredAt?.toISO() ?? null,
      })),
      revisionsLeft: Math.max(0, MAX_REVISIONS - (offer.revisions ?? []).length),
      canAskRevision: offer.status === 'pending' && (offer.revisions ?? []).length < MAX_REVISIONS,
      order: OrderTransformer.transform(this.resource.order).useVariant('forOffer'),
    }
  }
}
