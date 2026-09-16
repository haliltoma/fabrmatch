import Manufacturer from '#models/manufacturer'
import MatchOffer from '#models/match_offer'
import ProductionRequest from '#models/production_request'
import {
  selectManufacturer,
  type MatchCandidate,
  type MatchDecision,
  type MatchJob,
} from '#services/matching/match_engine'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

const ACTIVE_WORK_STATUSES = ['awaiting_acceptance', 'accepted', 'in_production', 'quality_check'] as const
const OFFER_TTL_HOURS = 24
const SHARE_WINDOW_DAYS = 30
const LOW_RISK_MAX_QUANTITY = 5
const LOW_RISK_MAX_UNIT_GRAMS = 300

async function buildCandidates(request: ProductionRequest): Promise<MatchCandidate[]> {
  const manufacturers = await Manufacturer.query().where('status', 'active')
  if (!manufacturers.length) {
    return []
  }

  const openWork = await ProductionRequest.query()
    .whereIn('status', [...ACTIVE_WORK_STATUSES])
    .whereNotNull('manufacturer_id')
    .whereNot('id', request.id)
  const committedGrams = new Map<number, number>()
  for (const work of openWork) {
    const grams = (work.unitWeightGrams ?? 0) * work.quantity
    committedGrams.set(work.manufacturerId!, (committedGrams.get(work.manufacturerId!) ?? 0) + grams)
  }

  const regionalWork = await ProductionRequest.query()
    .where('buyer_country', request.buyerCountry)
    .whereNotNull('manufacturer_id')
    .where('created_at', '>=', DateTime.now().minus({ days: SHARE_WINDOW_DAYS }).toSQL()!)
  const regionalCounts = new Map<number, number>()
  for (const work of regionalWork) {
    regionalCounts.set(work.manufacturerId!, (regionalCounts.get(work.manufacturerId!) ?? 0) + 1)
  }

  return manufacturers.map((manufacturer) => ({
    id: manufacturer.id,
    countryCode: manufacturer.countryCode,
    city: manufacturer.city,
    materials: manufacturer.materials,
    dailyCapacityGrams: manufacturer.dailyCapacityGrams,
    committedGrams: committedGrams.get(manufacturer.id) ?? 0,
    pricePerGram: manufacturer.pricePerGram,
    hourlyRate: manufacturer.hourlyRate,
    completedOrders: manufacturer.completedOrders,
    cancelledOrders: manufacturer.cancelledOrders,
    onTimeRate: manufacturer.onTimeRate,
    qualityScore: manufacturer.qualityScore,
    avgResponseMinutes: manufacturer.avgResponseMinutes,
    regionalShare: regionalWork.length ? (regionalCounts.get(manufacturer.id) ?? 0) / regionalWork.length : 0,
  }))
}

async function buildJob(request: ProductionRequest): Promise<MatchJob> {
  const refused = await MatchOffer.query()
    .where('production_request_id', request.id)
    .whereIn('status', ['declined', 'expired'])
  const unitGrams = request.unitWeightGrams

  return {
    material: request.material,
    quantity: request.quantity,
    buyerCountry: request.buyerCountry,
    buyerCity: request.buyerCity,
    estimate:
      unitGrams !== null && request.printEstimate
        ? { totalWeightG: unitGrams, printTimeMinutes: request.printEstimate.print_time_minutes }
        : null,
    lowRisk:
      request.quantity <= LOW_RISK_MAX_QUANTITY && unitGrams !== null && unitGrams <= LOW_RISK_MAX_UNIT_GRAMS,
    excludedManufacturerIds: refused.map((offer) => offer.manufacturerId),
  }
}

/**
 * Eşleşme bekleyen bir talebe üretici seçer ve 24 saat geçerli teklif açar.
 * Talep başka bir işlemde eşleştirildiyse (satır kilidi sonrası durum değişmişse) dokunmaz.
 */
export async function matchProductionRequest(
  requestId: number,
  rng: () => number = Math.random
): Promise<MatchDecision | null> {
  const request = await ProductionRequest.find(requestId)
  if (!request || request.status !== 'matching_in_progress') {
    return null
  }

  const decision = selectManufacturer(await buildCandidates(request), await buildJob(request), rng)

  return db.transaction(async (trx) => {
    const locked = await ProductionRequest.query({ client: trx }).where('id', requestId).forUpdate().firstOrFail()
    if (locked.status !== 'matching_in_progress') {
      return null
    }

    locked.matchAttempts += 1
    if (!decision.matched) {
      await locked.save()
      return decision
    }

    const manufacturer = await Manufacturer.findOrFail(decision.manufacturerId, { client: trx })
    await MatchOffer.create(
      {
        productionRequestId: locked.id,
        manufacturerId: manufacturer.id,
        selectionReason: decision.reason,
        score: decision.score,
        scoreBreakdown: decision.breakdown,
        quotedPayout: decision.payout,
        status: 'offered',
        expiresAt: DateTime.now().plus({ hours: OFFER_TTL_HOURS }),
      },
      { client: trx }
    )
    locked.merge({
      status: 'awaiting_acceptance',
      manufacturerId: manufacturer.id,
      manufacturerPayout: decision.payout,
      currencyCode: manufacturer.currencyCode,
    })
    await locked.save()
    return decision
  })
}
