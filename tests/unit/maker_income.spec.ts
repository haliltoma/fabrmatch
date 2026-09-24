import { test } from '@japa/runner'
import { estimateMakerIncome } from '#services/pricing/maker_income'
import {
  DEFAULT_HOURLY_RATE_MINOR,
  DEFAULT_MANUFACTURER_PROFIT_BPS,
  GRAMS_PER_PRINT_HOUR,
} from '#services/pricing/price_engine'

test.group('maker income estimator (M1-T4)', () => {
  test('one printer, 10 h a day, 40% busy, 0.50 TRY/g', ({ assert }) => {
    const e = estimateMakerIncome({
      printers: 1,
      hoursPerDay: 10,
      busyPercent: 40,
      pricePerGramMinor: 50,
    })
    assert.equal(e.printHoursPerMonth, 120)
    const material = Math.ceil(GRAMS_PER_PRINT_HOUR * 50)
    const perHour = Math.ceil(
      (material + DEFAULT_HOURLY_RATE_MINOR) * (1 + DEFAULT_MANUFACTURER_PROFIT_BPS / 10_000)
    )
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
      base.materialMinor + base.machineMinor + base.profitMinor,
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
