import { test } from '@japa/runner'
import { discountFor, type CouponRule } from '#services/pricing/coupon_math'

const ctx = {
  subtotalMinor: 10_000,
  baseSubtotalMinor: 10_000,
  platformFeeMinor: 1_500,
  rateE9: null,
}
const percent = (value: number, extra: Partial<CouponRule> = {}): CouponRule => ({
  kind: 'percent',
  value,
  minOrderMinor: 0,
  maxDiscountMinor: null,
  ...extra,
})

test.group('coupon discount', () => {
  test('a percentage applies to the items and rounds down', ({ assert }) => {
    assert.equal(discountFor(percent(1000), ctx), 1_000)
    assert.equal(discountFor(percent(333), { ...ctx, subtotalMinor: 999 }), 33)
  })

  test('a fixed amount is taken as is', ({ assert }) => {
    assert.equal(discountFor({ ...percent(0), kind: 'fixed', value: 500 }, ctx), 500)
  })

  test('the discount can never exceed the platform fee or the items', ({ assert }) => {
    assert.equal(discountFor(percent(5000), ctx), 1_500) // 50% would be 5000, fee is 1500
    assert.equal(
      discountFor(percent(5000), { ...ctx, platformFeeMinor: 99_999, subtotalMinor: 800 }),
      400
    )
    assert.equal(
      discountFor({ ...percent(0), kind: 'fixed', value: 50_000 }, { ...ctx, subtotalMinor: 700 }),
      700
    )
    assert.equal(discountFor(percent(1000), { ...ctx, platformFeeMinor: 0 }), 0)
  })

  test('the largest-discount cap and the minimum order are honoured', ({ assert }) => {
    assert.equal(discountFor(percent(1000, { maxDiscountMinor: 300 }), ctx), 300)
    assert.equal(discountFor(percent(1000, { minOrderMinor: 10_001 }), ctx), 0)
    assert.equal(discountFor(percent(1000, { minOrderMinor: 10_000 }), ctx), 1_000)
  })

  test('TRY amounts are converted for a foreign-currency order, the minimum stays in TRY', ({
    assert,
  }) => {
    const usd = {
      ...ctx,
      subtotalMinor: 250,
      baseSubtotalMinor: 10_000,
      platformFeeMinor: 40,
      rateE9: 25_000_000n,
    }
    // 50.00 TRY at 0.025 = 1.25 USD, capped by the 0.40 USD fee
    assert.equal(discountFor({ ...percent(0), kind: 'fixed', value: 5_000 }, usd), 40)
    assert.equal(
      discountFor({ ...percent(0), kind: 'fixed', value: 500 }, { ...usd, platformFeeMinor: 999 }),
      13 // 5.00 TRY = 0.125 USD → 13 cents
    )
    assert.equal(discountFor(percent(1000, { minOrderMinor: 10_001 }), usd), 0)
  })
})
