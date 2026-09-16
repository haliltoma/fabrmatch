/**
 * Eşleştirme motoru — saf fonksiyonlar, veritabanına dokunmaz (docs/03 + docs/04).
 *
 * Skor = kalite (reputasyon) + fiyat + yakınlık + müsaitlik ağırlıklı toplamı.
 * Adil şans mekanizmaları:
 * - Soğuk başlangıç: verisi olmayan üretici 0 değil, platform ortalamasıyla başlar
 * - Keşif payı: işlerin %20'si skor ağırlıklı rastgele seçimle dağıtılır
 * - Pay tavanı: bölgesel hacmin %30'unu geçen üretici aday olamaz (tek aday değilse)
 * - Koruma dönemi: ilk 15 siparişteki üretici düşük riskli işlerde bonus alır
 */

export const MATCHING_RULES = {
  weights: { quality: 0.35, price: 0.25, proximity: 0.2, availability: 0.2 },
  explorationRate: 0.2,
  maxRegionalShare: 0.3,
  protectionOrders: 15,
  protectionBonus: 0.15,
  coldStartMinOrders: 3,
  neutralQualityFallback: 0.5,
  leadDays: 5,
} as const

export type MatchCandidate = {
  id: number
  countryCode: string
  city: string
  materials: string[]
  dailyCapacityGrams: number
  /** Kabul edilmiş ama teslim edilmemiş işlerin toplam gramı */
  committedGrams: number
  pricePerGram: number
  hourlyRate: number
  completedOrders: number
  cancelledOrders: number
  onTimeRate: number | null
  qualityScore: number | null
  avgResponseMinutes: number | null
  /** Son 30 günde alıcı bölgesindeki taleplerden aldığı pay (0..1) */
  regionalShare: number
}

export type MatchJob = {
  material: string
  quantity: number
  buyerCountry: string
  buyerCity: string | null
  /** Birim başına metrikler; yoksa fiyat ve kapasite kıyaslanamaz */
  estimate: { totalWeightG: number; printTimeMinutes: number } | null
  /** Az adet ve üretilebilirlik uyarısı yok → yeni üreticiye güvenle verilebilir */
  lowRisk: boolean
  excludedManufacturerIds?: number[]
}

export type ScoreBreakdown = {
  quality: number
  price: number
  proximity: number
  availability: number
  protectionBonus: number
  coldStart: boolean
  total: number
}

export type MatchDecision =
  | {
      matched: true
      manufacturerId: number
      reason: 'score' | 'exploration' | 'protection'
      score: number
      breakdown: ScoreBreakdown
      payout: number | null
      candidatesConsidered: number
    }
  | { matched: false; reason: 'no_eligible_manufacturer'; candidatesConsidered: number }

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value))
const round = (value: number, digits = 4) => Math.round(value * 10 ** digits) / 10 ** digits

export function jobGrams(job: MatchJob): number | null {
  return job.estimate ? job.estimate.totalWeightG * job.quantity : null
}

export function estimatePayout(candidate: MatchCandidate, job: MatchJob): number | null {
  if (!job.estimate) {
    return null
  }
  const perUnit =
    job.estimate.totalWeightG * candidate.pricePerGram +
    (job.estimate.printTimeMinutes / 60) * candidate.hourlyRate
  return Math.round(perUnit * job.quantity * 100) / 100
}

function hasReputationData(candidate: MatchCandidate) {
  return (
    candidate.completedOrders >= MATCHING_RULES.coldStartMinOrders &&
    candidate.onTimeRate !== null &&
    candidate.qualityScore !== null
  )
}

/** Teslimat uyumu, kalite, iptal oranı, yanıt hızı ve hacimden 0..1 reputasyon. */
export function reputationScore(candidate: MatchCandidate): number {
  const finished = candidate.completedOrders + candidate.cancelledOrders
  const cancelRate = finished === 0 ? 0 : candidate.cancelledOrders / finished
  const response =
    candidate.avgResponseMinutes === null
      ? 0.5
      : clamp(1 - (candidate.avgResponseMinutes - 30) / (24 * 60 - 30))
  const volume = clamp(candidate.completedOrders / 50)

  return clamp(
    0.3 * (candidate.onTimeRate ?? 0) +
      0.3 * (candidate.qualityScore ?? 0) +
      0.15 * (1 - cancelRate) +
      0.15 * response +
      0.1 * volume
  )
}

function proximityScore(candidate: MatchCandidate, job: MatchJob) {
  if (candidate.countryCode !== job.buyerCountry) {
    return 0.2
  }
  if (job.buyerCity && candidate.city.toLocaleLowerCase('tr') === job.buyerCity.toLocaleLowerCase('tr')) {
    return 1
  }
  return 0.6
}

function isEligible(candidate: MatchCandidate, job: MatchJob) {
  if (job.excludedManufacturerIds?.includes(candidate.id)) {
    return false
  }
  if (!candidate.materials.includes(job.material)) {
    return false
  }
  const grams = jobGrams(job)
  if (grams !== null) {
    const windowCapacity = candidate.dailyCapacityGrams * MATCHING_RULES.leadDays
    if (candidate.committedGrams + grams > windowCapacity) {
      return false
    }
  }
  return true
}

export function scoreCandidates(candidates: MatchCandidate[], job: MatchJob) {
  const rated = candidates.filter(hasReputationData)
  const neutralQuality = rated.length
    ? rated.reduce((sum, c) => sum + reputationScore(c), 0) / rated.length
    : MATCHING_RULES.neutralQualityFallback

  const payouts = candidates.map((c) => estimatePayout(c, job))
  const knownPayouts = payouts.filter((p): p is number => p !== null && p > 0)
  const cheapest = knownPayouts.length ? Math.min(...knownPayouts) : null
  const grams = jobGrams(job) ?? 0
  const { weights } = MATCHING_RULES

  return candidates.map((candidate, index) => {
    const coldStart = !hasReputationData(candidate)
    const quality = coldStart ? neutralQuality : reputationScore(candidate)
    const payout = payouts[index]
    const price = cheapest !== null && payout ? cheapest / payout : 1
    const proximity = proximityScore(candidate, job)
    const windowCapacity = candidate.dailyCapacityGrams * MATCHING_RULES.leadDays
    const availability = clamp(1 - (candidate.committedGrams + grams) / windowCapacity)
    const protectionBonus =
      job.lowRisk && candidate.completedOrders < MATCHING_RULES.protectionOrders
        ? MATCHING_RULES.protectionBonus
        : 0

    const base =
      weights.quality * quality +
      weights.price * price +
      weights.proximity * proximity +
      weights.availability * availability

    const breakdown: ScoreBreakdown = {
      quality: round(quality),
      price: round(price),
      proximity: round(proximity),
      availability: round(availability),
      protectionBonus,
      coldStart,
      total: round(base + protectionBonus),
    }
    return { candidate, base, breakdown, payout }
  })
}

/**
 * @param rng [0,1) üreten fonksiyon — testlerde deterministik verilir.
 */
export function selectManufacturer(
  candidates: MatchCandidate[],
  job: MatchJob,
  rng: () => number = Math.random
): MatchDecision {
  const eligible = candidates.filter((c) => isEligible(c, job))
  const underCap = eligible.filter((c) => c.regionalShare < MATCHING_RULES.maxRegionalShare)
  // Tavan tek adayı da eleyecekse iş yapılmadan kalmasın
  const pool = underCap.length ? underCap : eligible

  if (!pool.length) {
    return { matched: false, reason: 'no_eligible_manufacturer', candidatesConsidered: candidates.length }
  }

  const scored = scoreCandidates(pool, job).sort(
    (a, b) => b.breakdown.total - a.breakdown.total || a.candidate.id - b.candidate.id
  )

  let chosen = scored[0]
  let reason: 'score' | 'exploration' | 'protection' = 'score'

  if (scored.length > 1 && rng() < MATCHING_RULES.explorationRate) {
    const totalWeight = scored.reduce((sum, s) => sum + s.breakdown.total, 0)
    let target = rng() * totalWeight
    chosen = scored.find((s) => (target -= s.breakdown.total) < 0) ?? scored[scored.length - 1]
    reason = 'exploration'
  } else if (chosen.breakdown.protectionBonus > 0) {
    const bestWithoutBonus = [...scored].sort((a, b) => b.base - a.base || a.candidate.id - b.candidate.id)[0]
    if (bestWithoutBonus.candidate.id !== chosen.candidate.id) {
      reason = 'protection'
    }
  }

  return {
    matched: true,
    manufacturerId: chosen.candidate.id,
    reason,
    score: chosen.breakdown.total,
    breakdown: chosen.breakdown,
    payout: chosen.payout,
    candidatesConsidered: candidates.length,
  }
}
