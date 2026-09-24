import { test } from '@japa/runner'
import { estimateMakerIncome } from '#services/pricing/maker_income'
import {
  DEFAULT_HOURLY_RATE_MINOR,
  DEFAULT_MANUFACTURER_PROFIT_BPS,
  GRAMS_PER_PRINT_HOUR,
} from '#services/pricing/price_engine'

test.group('home income calculator', () => {
  test('the browser formula matches the server formula', async ({ assert }) => {
    const url = new URL('../../inertia/lib/income.ts', import.meta.url).href
    type Input = {
      printers: number
      hoursPerDay: number
      busyPercent: number
      pricePerGramMinor: number
    }
    const { monthlyIncomeMinor } = (await import(url)) as {
      monthlyIncomeMinor: (
        input: Input,
        rules: { gramsPerHour: number; hourlyRateMinor: number; profitBps: number }
      ) => { monthlyMinor: number }
    }
    const rules = {
      gramsPerHour: GRAMS_PER_PRINT_HOUR,
      hourlyRateMinor: DEFAULT_HOURLY_RATE_MINOR,
      profitBps: DEFAULT_MANUFACTURER_PROFIT_BPS,
    }
    for (const input of [
      { printers: 1, hoursPerDay: 6, busyPercent: 40, pricePerGramMinor: 60 },
      { printers: 3, hoursPerDay: 10, busyPercent: 75, pricePerGramMinor: 45 },
      { printers: 2, hoursPerDay: 24, busyPercent: 100, pricePerGramMinor: 120 },
    ]) {
      assert.equal(
        monthlyIncomeMinor(input, rules).monthlyMinor,
        estimateMakerIncome(input).monthlyMinor
      )
    }
  })
})
