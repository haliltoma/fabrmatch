import { test } from '@japa/runner'
import { covering, makerBudget } from '#services/pricing/maker_budget'

const rules = {
  coverageBps: 7500,
  lowBps: 2000,
  highBps: 8000,
  minMakers: 3,
  fallbackBandBps: 1500,
}

test.group('maker budget (Paket V)', () => {
  test('the worked example: four makers, the budget pays three of them', ({ assert }) => {
    // docs/PAKET_V_TARTISMA.md §5: floors 205, 225, 240, 260 TRY
    const result = makerBudget([22_500, 20_500, 26_000, 24_000], 20_000, rules)
    assert.equal(result.budgetMinor, 24_000)
    assert.equal(result.makers, 4)
    assert.isAtMost(result.lowMinor, result.budgetMinor)
    assert.isAtLeast(result.highMinor, result.budgetMinor)
  })

  test('the budget covers at least the configured share of makers', ({ assert }) => {
    for (let n = 3; n < 40; n++) {
      const floors = Array.from({ length: n }, (_, i) => 10_000 + ((i * 7919) % 5000))
      for (const coverageBps of [5000, 7500, 8000, 10_000]) {
        const { budgetMinor } = makerBudget(floors, 0, { ...rules, coverageBps })
        const fit = floors.filter((f) => f <= budgetMinor).length
        assert.isAtLeast(fit * 10_000, n * coverageBps, `n=${n} coverage=${coverageBps}`)
      }
    }
  })

  test('with few makers the reference sets the price, up to the band for a dearer maker', ({
    assert,
  }) => {
    const cheapOnes = makerBudget([15_000, 16_000], 20_000, rules)
    assert.equal(cheapOnes.budgetMinor, 20_000)
    const littleDearer = makerBudget([22_000], 20_000, rules)
    assert.equal(littleDearer.budgetMinor, 22_000, 'within the 15 % band: they fit')
    const outlier = makerBudget([100_000], 20_000, rules)
    assert.equal(outlier.budgetMinor, 23_000, 'capped at the band; the outlier is not matched')
    assert.equal(outlier.highMinor, 23_000)
    const nobody = makerBudget([], 20_000, rules)
    assert.equal(nobody.budgetMinor, 20_000)
    assert.equal(nobody.makers, 0)
  })

  test('covering picks the value at the share', ({ assert }) => {
    assert.equal(covering([1, 2, 3, 4], 7500), 3)
    assert.equal(covering([1, 2, 3, 4], 10_000), 4)
    assert.equal(covering([1, 2, 3, 4], 0), 1)
  })
})
