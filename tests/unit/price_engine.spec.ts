import { test } from '@japa/runner'
import fabrmatchConfig from '#config/fabrmatch'
import {
  calculatePrice,
  estimateGrams,
  estimatePrintMinutes,
  referenceCostProfile,
  type PriceInput,
} from '#services/pricing/price_engine'
import { makerCost } from '#services/pricing/maker_cost'

test.group('PriceEngine', () => {
  test('estimateGrams for PLA 20mm cube (8000 mm³)', ({ assert }) => {
    // PLA density 0.00124, default infill 0.2
    // shell 10% at full density + 90% at 20% infill
    // = 8000 * 0.00124 * (0.1 + 0.9 * 0.2) = 8000 * 0.00124 * 0.28 = 2.7776
    const grams = estimateGrams(8000, 'PLA')
    assert.closeTo(grams, 2.78, 0.1)
  })

  test('estimateGrams for ABS larger volume', ({ assert }) => {
    // 50000 mm³, ABS density 0.00104, infill 0.3
    // = 50000 * 0.00104 * (0.1 + 0.9 * 0.3) = 50000 * 0.00104 * 0.37 = 19.24
    const grams = estimateGrams(50000, 'ABS', 0.3)
    assert.closeTo(grams, 19.24, 0.5)
  })

  test('estimatePrintMinutes returns positive', ({ assert }) => {
    const minutes = estimatePrintMinutes(10)
    assert.isAbove(minutes, 0)
    assert.equal(minutes, 50) // 10g / 0.2 g/min = 50
  })

  test('calculatePrice returns all integer minor units', ({ assert }) => {
    const input: PriceInput = {
      volumeMm3: 8000,
      material: 'PLA',
      pricePerGramMinor: 50, // 0.50 TL/g
      quantity: 1,
      sellerMarginBps: 2000, // 20%
    }

    const result = calculatePrice(input)

    // All money values must be integers
    assert.equal(result.materialCostMinor, Math.ceil(result.materialCostMinor))
    assert.equal(result.machineCostMinor, Math.ceil(result.machineCostMinor))
    assert.equal(result.manufacturerShareMinor, Math.ceil(result.manufacturerShareMinor))
    assert.equal(result.platformCommissionMinor, Math.ceil(result.platformCommissionMinor))
    assert.equal(result.unitPriceMinor, Math.ceil(result.unitPriceMinor))
    assert.equal(result.totalPriceMinor, Math.ceil(result.totalPriceMinor))

    // Currency
    assert.equal(result.currency, 'TRY')
  })

  test('quantity multiplies total correctly', ({ assert }) => {
    const input: PriceInput = {
      volumeMm3: 8000,
      material: 'PLA',
      pricePerGramMinor: 50,
      quantity: 1,
      sellerMarginBps: 2000,
    }

    const single = calculatePrice(input)
    const triple = calculatePrice({ ...input, quantity: 3 })

    assert.equal(triple.totalPriceMinor, single.unitPriceMinor * 3)
    assert.equal(triple.unitPriceMinor, single.unitPriceMinor)
  })

  test('higher infill increases price', ({ assert }) => {
    const base: PriceInput = {
      volumeMm3: 10000,
      material: 'PLA',
      pricePerGramMinor: 50,
      quantity: 1,
      sellerMarginBps: 1500,
    }

    const low = calculatePrice({ ...base, infill: 0.1 })
    const high = calculatePrice({ ...base, infill: 0.5 })

    assert.isAbove(high.totalPriceMinor, low.totalPriceMinor)
    assert.isAbove(high.estGrams, low.estGrams)
  })

  test('table test: material × volume × quantity', ({ assert }) => {
    const cases: { material: string; volumeMm3: number; qty: number; pricePerGram: number }[] = [
      { material: 'PLA', volumeMm3: 8000, qty: 1, pricePerGram: 50 },
      { material: 'PLA', volumeMm3: 8000, qty: 5, pricePerGram: 50 },
      { material: 'ABS', volumeMm3: 50000, qty: 1, pricePerGram: 60 },
      { material: 'RESIN', volumeMm3: 3000, qty: 10, pricePerGram: 150 },
      { material: 'NYLON', volumeMm3: 100000, qty: 2, pricePerGram: 80 },
    ]

    for (const c of cases) {
      const result = calculatePrice({
        volumeMm3: c.volumeMm3,
        material: c.material,
        pricePerGramMinor: c.pricePerGram,
        quantity: c.qty,
        sellerMarginBps: 2000,
      })

      // Invariants
      assert.isAbove(result.estGrams, 0, `${c.material} ${c.volumeMm3}mm³: grams > 0`)
      assert.isAbove(result.materialCostMinor, 0, `${c.material}: material cost > 0`)
      assert.isAbove(result.machineCostMinor, 0, `${c.material}: machine cost > 0`)
      assert.isAbove(
        result.manufacturerShareMinor,
        result.materialCostMinor + result.machineCostMinor,
        `${c.material}: manufacturer share > raw cost (profit margin)`
      )
      assert.isAbove(result.platformCommissionMinor, 0, `${c.material}: commission > 0`)
      assert.equal(
        result.totalPriceMinor,
        result.unitPriceMinor * c.qty,
        `${c.material}: total = unit × qty`
      )
      assert.isAbove(
        result.unitPriceMinor,
        result.baseCostMinor,
        `${c.material}: unit > base (seller margin)`
      )
    }
  })

  test('zero seller margin means unit price equals base cost', ({ assert }) => {
    const result = calculatePrice({
      volumeMm3: 8000,
      material: 'PLA',
      pricePerGramMinor: 50,
      quantity: 1,
      sellerMarginBps: 0,
    })

    assert.equal(result.sellerMarginMinor, 0)
    assert.equal(result.unitPriceMinor, result.baseCostMinor)
  })

  test('custom commission and manufacturer profit', ({ assert }) => {
    const result = calculatePrice({
      volumeMm3: 8000,
      material: 'PLA',
      pricePerGramMinor: 50,
      quantity: 1,
      sellerMarginBps: 2000,
      commissionBps: 500, // 5%
      costProfile: { ...referenceCostProfile(50), profitBps: 2000 },
    })

    // Lower commission = lower total vs default 10%
    const defaultResult = calculatePrice({
      volumeMm3: 8000,
      material: 'PLA',
      pricePerGramMinor: 50,
      quantity: 1,
      sellerMarginBps: 2000,
    })

    assert.isBelow(result.platformCommissionMinor, defaultResult.platformCommissionMinor)
  })

  test('the maker share is the reference maker of the admin settings (Paket V)', ({ assert }) => {
    const result = calculatePrice({
      volumeMm3: 8000,
      material: 'PLA',
      pricePerGramMinor: 50,
      quantity: 1,
      sellerMarginBps: 0,
      estGrams: 100,
      estPrintMinutes: 300,
    })
    const expected = makerCost(referenceCostProfile(50), { grams: 100, minutes: 300 })
    assert.equal(result.manufacturerShareMinor, expected.floorMinor)
    // the share pays cost plus at least the minimum profit
    assert.isAtLeast(
      result.manufacturerShareMinor,
      Math.floor((expected.costMinor * (10_000 + fabrmatchConfig.makerPay.minProfitBps)) / 10_000)
    )
  })

  test('default commission comes from config/fabrmatch.ts (single source of truth)', ({
    assert,
  }) => {
    const input = {
      volumeMm3: 10_000,
      material: 'PLA',
      pricePerGramMinor: 50,
      quantity: 1,
      sellerMarginBps: 0,
    }
    const original = fabrmatchConfig.pricing.commissionBps
    try {
      const atDefault = calculatePrice(input)
      assert.equal(
        atDefault.platformCommissionMinor,
        Math.ceil((atDefault.manufacturerShareMinor * original) / 10_000)
      )

      fabrmatchConfig.pricing.commissionBps = 3000
      const higher = calculatePrice(input)
      assert.isAbove(higher.platformCommissionMinor, atDefault.platformCommissionMinor)
      assert.equal(
        higher.platformCommissionMinor,
        Math.ceil((higher.manufacturerShareMinor * 3000) / 10_000)
      )
    } finally {
      fabrmatchConfig.pricing.commissionBps = original
    }
  })
})
