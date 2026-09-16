import Manufacturer from '#models/manufacturer'
import { reputationScore } from '#services/matching/match_engine'
import { DateTime } from 'luxon'

/**
 * P0-1: Hesaplanan reputasyon skorunu veritabanına yazar.
 * quality_check ve delivered olaylarında çağrılır.
 * Üretici trx içinde yüklendiyse save() aynı trx'i kullanır.
 */
export async function updateReputationScore(manufacturer: Manufacturer): Promise<void> {
  const score = reputationScore({
    id: manufacturer.id,
    countryCode: (manufacturer as any).countryCode ?? '',
    city: (manufacturer as any).city ?? '',
    materials: manufacturer.materials,
    dailyCapacityGrams: (manufacturer as any).dailyCapacityGrams ?? 0,
    committedGrams: 0,
    pricePerGram: (manufacturer as any).pricePerGram ?? 0,
    hourlyRate: (manufacturer as any).hourlyRate ?? 0,
    completedOrders: manufacturer.completedOrders,
    cancelledOrders: manufacturer.cancelledOrders,
    onTimeRate: manufacturer.onTimeRate,
    qualityScore: manufacturer.qualityScore,
    avgResponseMinutes: manufacturer.avgResponseMinutes,
    regionalShare: 0,
  })
  manufacturer.reputationScore = score
  await manufacturer.save()
}

/**
 * P0-1: Teklif kabul/red süresini avgResponseMinutes EWA ile günceller.
 * α = 0.3 → son yanıt ağırlığı %30, geçmiş %70.
 */
export async function updateResponseTime(
  manufacturer: Manufacturer,
  offerCreatedAt: DateTime,
  respondedAt: DateTime
): Promise<void> {
  const elapsedMinutes = respondedAt.diff(offerCreatedAt, 'minutes').minutes
  const α = 0.3
  const prev = manufacturer.avgResponseMinutes
  manufacturer.avgResponseMinutes =
    prev === null ? elapsedMinutes : α * elapsedMinutes + (1 - α) * prev
  await manufacturer.save()
}
