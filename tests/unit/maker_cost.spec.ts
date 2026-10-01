import { test } from '@japa/runner'
import { clampProfitBps, makerCost, type CostProfile } from '#services/pricing/maker_cost'

const profileA: CostProfile = {
  materialCostPerKgMinor: 60_000, // 600 TL/kg
  hourlyRateMinor: 1500, // 15 TL/h
  setupMinor: 3000, // 30 TL
  wasteBps: 1000,
  failureBps: 500,
  profitBps: 2500,
}

test.group('maker cost and floor (Paket V)', () => {
  test('the worked example of docs/PAKET_V_TARTISMA.md §5', ({ assert }) => {
    const result = makerCost(profileA, { grams: 100, minutes: 300 })
    assert.equal(result.materialMinor, 6600) // 0.1 kg × 600 × 1.10
    assert.equal(result.machineMinor, 7500) // 5 h × 15
    assert.equal(result.costMinor, 18_000) // 171 ÷ 0.95
    assert.equal(result.floorMinor, 22_500) // × 1.25
  })

  test('the floor always covers cost plus the profit, whatever the inputs', ({ assert }) => {
    for (let i = 0; i < 500; i++) {
      const profile: CostProfile = {
        materialCostPerKgMinor: 1 + ((i * 7919) % 200_000),
        hourlyRateMinor: (i * 104_729) % 20_000,
        setupMinor: (i * 31) % 10_000,
        wasteBps: (i * 13) % 3000,
        failureBps: (i * 17) % 3000,
        profitBps: 2500 + (i % 6) * 100,
      }
      const work = { grams: ((i * 37) % 2000) / 3 + 0.1, minutes: (i * 11) % 3000 }
      const r = makerCost(profile, work)
      const direct =
        (profile.materialCostPerKgMinor * work.grams * (1 + profile.wasteBps / 10_000)) / 1000 +
        (work.minutes * profile.hourlyRateMinor) / 60 +
        profile.setupMinor
      const exact = (direct / (1 - profile.failureBps / 10_000)) * (1 + profile.profitBps / 10_000)
      assert.isAtLeast(r.floorMinor, Math.floor(exact), `case ${i}`)
      assert.isTrue(Number.isInteger(r.floorMinor))
      assert.equal(r.floorMinor, r.costMinor + r.profitMinor + r.finishingMinor)
    }
  })

  test('finishing is paid on top as quoted', ({ assert }) => {
    const plain = makerCost(profileA, { grams: 100, minutes: 300 })
    const sanded = makerCost(profileA, { grams: 100, minutes: 300, finishingMinor: 4000 })
    assert.equal(sanded.floorMinor - plain.floorMinor, 4000)
  })

  test('a failure rate of 100 % is refused', ({ assert }) => {
    assert.throws(() => makerCost({ ...profileA, failureBps: 10_000 }, { grams: 1, minutes: 1 }))
  })

  test('the profit stays between the admin minimum and maximum', ({ assert }) => {
    assert.equal(clampProfitBps(1000, 2500, 3000), 2500)
    assert.equal(clampProfitBps(2800, 2500, 3000), 2800)
    assert.equal(clampProfitBps(5000, 2500, 3000), 3000)
    // an admin who sets the maximum below the minimum: the minimum wins
    assert.equal(clampProfitBps(5000, 2500, 2000), 2500)
  })
})
