import MatchProductionRequest from '#jobs/match_production_request'
import MatchOffer from '#models/match_offer'
import ProductionRequest from '#models/production_request'
import { DateTime } from 'luxon'

/** Bu süreden daha eski, hâlâ eşleşmemiş talepler periyodik olarak yeniden denenir. */
const STALE_MATCHING_MINUTES = 5

/**
 * Üreticinin yanıtlamadığı teklifleri süresi dolmuş sayar, talebi eşleştirmeye geri
 * döndürür ve yeniden eşleştirmeyi tetikler. `buildJob` (match_engine üzerinden) süresi
 * dolan teklifin sahibini bir sonraki denemede otomatik hariç tutar.
 */
export async function expireStaleOffers(now = DateTime.now()): Promise<number[]> {
  const expired = await MatchOffer.query().where('status', 'offered').where('expires_at', '<=', now.toSQL()!)

  const requestIds: number[] = []
  for (const offer of expired) {
    offer.merge({ status: 'expired', respondedAt: now })
    await offer.save()

    const request = await ProductionRequest.query()
      .where('id', offer.productionRequestId)
      .where('status', 'awaiting_acceptance')
      .first()
    if (request) {
      request.merge({ status: 'matching_in_progress', manufacturerId: null, manufacturerPayout: null })
      await request.save()
      requestIds.push(request.id)
    }
  }

  for (const id of requestIds) {
    await MatchProductionRequest.dispatch({ productionRequestId: id })
  }
  return requestIds
}

/**
 * İlk denemede uygun üretici bulunamayan talepleri (kapasite dolmuş, malzeme eksik vb.)
 * periyodik olarak yeniden dener — koşullar zamanla değişebilir (yeni üretici, boşalan kapasite).
 */
export async function retryUnmatchedRequests(now = DateTime.now()): Promise<number[]> {
  const stale = await ProductionRequest.query()
    .where('status', 'matching_in_progress')
    .where('match_attempts', '>', 0)
    .where('updated_at', '<=', now.minus({ minutes: STALE_MATCHING_MINUTES }).toSQL()!)

  for (const request of stale) {
    await MatchProductionRequest.dispatch({ productionRequestId: request.id })
  }
  return stale.map((request) => request.id)
}
