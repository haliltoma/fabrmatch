import { test } from '@japa/runner'
import { estimateMakerIncome, incomeRules } from '#services/pricing/maker_income'

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
        rules: ReturnType<typeof incomeRules>
      ) => { monthlyMinor: number }
    }
    const rules = incomeRules()
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
