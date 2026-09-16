import { test } from '@japa/runner'
import {
  MATCHING_RULES,
  estimatePayout,
  selectManufacturer,
  type MatchCandidate,
  type MatchJob,
} from '#services/matching/match_engine'

const veteran = (overrides: Partial<MatchCandidate> = {}): MatchCandidate => ({
  id: 1,
  countryCode: 'TR',
  city: 'Mersin',
  materials: ['PLA', 'PETG'],
  dailyCapacityGrams: 2000,
  committedGrams: 0,
  pricePerGram: 0.9,
  hourlyRate: 20,
  completedOrders: 120,
  cancelledOrders: 2,
  onTimeRate: 0.97,
  qualityScore: 0.95,
  avgResponseMinutes: 20,
  regionalShare: 0.1,
  ...overrides,
})

const newcomer = (overrides: Partial<MatchCandidate> = {}): MatchCandidate =>
  veteran({
    id: 2,
    completedOrders: 0,
    cancelledOrders: 0,
    onTimeRate: null,
    qualityScore: null,
    avgResponseMinutes: null,
    regionalShare: 0,
    ...overrides,
  })

const job = (overrides: Partial<MatchJob> = {}): MatchJob => ({
  material: 'PLA',
  quantity: 2,
  buyerCountry: 'TR',
  buyerCity: 'Mersin',
  estimate: { totalWeightG: 52, printTimeMinutes: 95 },
  lowRisk: false,
  ...overrides,
})

const noExploration = () => 0.99

test.group('Match engine', () => {
  test('payout is weight × gram price plus print time × hourly rate, per unit × quantity', ({ assert }) => {
    // 2 × (52 × 0.9 + 95/60 × 20) = 2 × (46.8 + 31.6667) = 156.93
    assert.equal(estimatePayout(veteran(), job()), 156.93)
    assert.isNull(estimatePayout(veteran(), job({ estimate: null })))
  })

  test('picks the best scored manufacturer and reports the reason', ({ assert }) => {
    const far = veteran({ id: 3, city: 'İzmir', pricePerGram: 1.4 })
    const decision = selectManufacturer([far, veteran()], job(), noExploration)

    assert.isTrue(decision.matched)
    assert.equal(decision.matched && decision.manufacturerId, 1)
    assert.equal(decision.matched && decision.reason, 'score')
  })

  test('skips manufacturers without the material, over capacity, or previously declined', ({ assert }) => {
    const petgOnly = veteran({ id: 3, materials: ['PETG'] })
    const full = veteran({ id: 4, committedGrams: 2000 * MATCHING_RULES.leadDays })
    const declined = veteran({ id: 5 })
    const decision = selectManufacturer(
      [petgOnly, full, declined],
      job({ excludedManufacturerIds: [5] }),
      noExploration
    )

    assert.deepEqual(decision, { matched: false, reason: 'no_eligible_manufacturer', candidatesConsidered: 3 })
  })

  test('a manufacturer above the regional share cap is not chosen while others exist', ({ assert }) => {
    const dominant = veteran({ id: 1, regionalShare: 0.45 })
    const other = veteran({ id: 2, city: 'Adana', pricePerGram: 1.1, regionalShare: 0.05 })

    const decision = selectManufacturer([dominant, other], job(), noExploration)
    assert.equal(decision.matched && decision.manufacturerId, 2)

    const alone = selectManufacturer([dominant], job(), noExploration)
    assert.equal(alone.matched && alone.manufacturerId, 1)
  })

  test('cold start gets the platform average quality, not zero', ({ assert }) => {
    const decision = selectManufacturer([newcomer({ city: 'Adana' })], job(), noExploration)

    assert.isTrue(decision.matched && decision.breakdown.coldStart)
    assert.isAbove(decision.matched ? decision.breakdown.quality : 0, 0)
  })

  test('protection bonus lets a newcomer win low-risk jobs but not high-risk ones', ({ assert }) => {
    const candidates = [veteran(), newcomer()]

    const lowRisk = selectManufacturer(candidates, job({ lowRisk: true }), noExploration)
    assert.equal(lowRisk.matched && lowRisk.manufacturerId, 2)
    assert.equal(lowRisk.matched && lowRisk.reason, 'protection')

    const highRisk = selectManufacturer(candidates, job({ lowRisk: false }), noExploration)
    assert.equal(highRisk.matched && highRisk.manufacturerId, 1)
  })

  test('exploration share picks by weighted random instead of the top score', ({ assert }) => {
    const rolls = [0.05, 0.99]
    const decision = selectManufacturer([veteran(), veteran({ id: 2, city: 'Adana' })], job(), () => rolls.shift()!)

    assert.equal(decision.matched && decision.reason, 'exploration')
    assert.equal(decision.matched && decision.manufacturerId, 2)
  })

  test('a newly registered manufacturer receives an order within its first 15 jobs', ({ assert }) => {
    // 03 başarı kriteri: yerleşik ve daha iyi puanlı üç rakibe karşı, karışık riskli işlerde
    let seed = 42
    const rng = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)
    const established = [veteran(), veteran({ id: 3, city: 'Adana' }), veteran({ id: 4, city: 'Tarsus' })]
    const fresh = newcomer({ id: 9, city: 'Adana' })

    const firstWin = Array.from({ length: 15 }, (_, index) =>
      selectManufacturer([...established, fresh], job({ lowRisk: index % 3 !== 0 }), rng)
    ).findIndex((decision) => decision.matched && decision.manufacturerId === 9)

    assert.isAtLeast(firstWin, 0)
  })
})
