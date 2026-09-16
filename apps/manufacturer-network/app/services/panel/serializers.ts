import Manufacturer from '#models/manufacturer'
import type MatchOffer from '#models/match_offer'
import type ProductionRequest from '#models/production_request'

/**
 * Panel sayfalarına giden düz JSON şekilleri. Karşılığı: inertia/lib/panel_types.ts
 * Alıcı kimliği hiç gönderilmez — üretici sadece şehir/ülke görür (00: kimlikler gizli).
 */

export const findManufacturerForUser = (userId: number) =>
  Manufacturer.query().where('user_id', userId).first()

export function serializeManufacturer(manufacturer: Manufacturer) {
  return {
    displayName: manufacturer.displayName,
    publicCode: manufacturer.publicCode,
    status: manufacturer.status,
    completedOrders: manufacturer.completedOrders,
  }
}

export function serializeJob(request: ProductionRequest) {
  return {
    id: request.id,
    publicId: request.publicId,
    designReference: request.designReference,
    material: request.material,
    color: request.color,
    quantity: request.quantity,
    status: request.status,
    buyerCountry: request.buyerCountry,
    buyerCity: request.buyerCity,
    requestedDeliveryBy: request.requestedDeliveryBy.toISODate()!,
    payout: request.manufacturerPayout,
    currencyCode: request.currencyCode,
  }
}

export function serializeOffer(offer: MatchOffer) {
  return {
    id: offer.id,
    expiresAt: offer.expiresAt.toISO()!,
    quotedPayout: offer.quotedPayout,
    job: serializeJob(offer.productionRequest),
  }
}

export function serializeJobDetail(request: ProductionRequest) {
  return {
    ...serializeJob(request),
    trackingNumber: request.trackingNumber,
    productionPhotos: request.productionPhotos ?? [],
    printEstimate: request.printEstimate,
    acceptedAt: request.acceptedAt?.toISO() ?? null,
    shippedAt: request.shippedAt?.toISO() ?? null,
    deliveredAt: request.deliveredAt?.toISO() ?? null,
  }
}
