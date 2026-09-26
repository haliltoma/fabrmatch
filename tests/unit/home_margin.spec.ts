import { test } from '@japa/runner'
import { calculatePrice } from '#services/pricing/price_engine'

test.group('home margin calculator', () => {
  test('the browser margin split matches the price engine', async ({ assert }) => {
    const url = new URL('../../inertia/lib/margin.ts', import.meta.url).href
    const { marginSplit } = (await import(url)) as {
      marginSplit: (cost: number, pct: number) => { earnsMinor: number; buyerPriceMinor: number }
    }
    for (const [volumeMm3, pct] of [
      [8000, 30],
      [52000, 15],
      [3100, 100],
    ]) {
      const base = {
        volumeMm3,
        material: 'PLA',
        pricePerGramMinor: 60,
        quantity: 1,
        shippingMinor: 4000,
      }
      const cost = calculatePrice({ ...base, sellerMarginBps: 0 }).unitPriceMinor
      const priced = calculatePrice({ ...base, sellerMarginBps: pct * 100 })
      const split = marginSplit(cost, pct)
      assert.equal(split.earnsMinor, priced.sellerMarginMinor)
      assert.equal(split.buyerPriceMinor, priced.unitPriceMinor)
    }
  })
})
