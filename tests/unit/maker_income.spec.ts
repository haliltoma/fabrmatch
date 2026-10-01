import { test } from '@japa/runner'
import { estimateMakerIncome } from '#services/pricing/maker_income'
import { GRAMS_PER_PRINT_HOUR, referenceCostProfile } from '#services/pricing/price_engine'
import { makerCost } from '#services/pricing/maker_cost'

test.group('maker income estimator (M1-T4)', () => {
  test('one printer, 10 h a day, 40% busy, 0.50 TRY/g', ({ assert }) => {
    const e = estimateMakerIncome({
      printers: 1,
      hoursPerDay: 10,
      busyPercent: 40,
      pricePerGramMinor: 50,
    })
    assert.equal(e.printHoursPerMonth, 120)
    // one print hour of the reference maker (admin settings), material at the visitor's price
    const perHour = makerCost(
      { ...referenceCostProfile(50), setupMinor: 0 },
      { grams: GRAMS_PER_PRINT_HOUR, minutes: 60 }
    ).floorMinor
    assert.equal(e.perPrintHourMinor, perHour)
    assert.equal(e.monthlyMinor, perHour * 120)
    assert.equal(e.gramsPerMonth, 120 * GRAMS_PER_PRINT_HOUR)
  })

  test('the parts add up to the total and scale linearly with printers and busyness', ({
    assert,
  }) => {
    const base = estimateMakerIncome({
      printers: 1,
      hoursPerDay: 8,
      busyPercent: 50,
      pricePerGramMinor: 60,
    })
    assert.approximately(
      base.materialMinor + base.machineMinor + base.allowanceMinor + base.profitMinor,
      base.monthlyMinor,
      2
    )
    const double = estimateMakerIncome({
      printers: 2,
      hoursPerDay: 8,
      busyPercent: 50,
      pricePerGramMinor: 60,
    })
    assert.equal(double.monthlyMinor, base.monthlyMinor * 2)
    const idle = estimateMakerIncome({
      printers: 1,
      hoursPerDay: 8,
      busyPercent: 25,
      pricePerGramMinor: 60,
    })
    assert.equal(idle.monthlyMinor, base.monthlyMinor / 2)
  })

  test('a higher material price earns more per hour; out-of-range busyness is clamped', ({
    assert,
  }) => {
    const cheap = estimateMakerIncome({
      printers: 1,
      hoursPerDay: 1,
      busyPercent: 100,
      pricePerGramMinor: 40,
    })
    const dear = estimateMakerIncome({
      printers: 1,
      hoursPerDay: 1,
      busyPercent: 100,
      pricePerGramMinor: 80,
    })
    assert.isAbove(dear.perPrintHourMinor, cheap.perPrintHourMinor)
    const over = estimateMakerIncome({
      printers: 1,
      hoursPerDay: 1,
      busyPercent: 900,
      pricePerGramMinor: 40,
    })
    assert.equal(over.printHoursPerMonth, 30)
  })
})
