import { test } from '@japa/runner'
import vine from '@vinejs/vine'
import { moneyMinor } from '#validators/money'

const schema = vine.create({ amount: moneyMinor({ min: 1, max: 100_000_00 }) })
const minorOf = async (amount: unknown) => (await schema.validate({ amount })).amount

test.group('money validator (no float maths)', () => {
  test('typed text and two-decimal numbers become exact minor units', async ({ assert }) => {
    assert.equal(await minorOf('12,50'), 1250)
    assert.equal(await minorOf('1.234,56'), 123_456)
    assert.equal(await minorOf(0.29), 29) // 0.29 * 100 is 28.999… in floats
    assert.equal(await minorOf(12.5), 1250)
    assert.equal(await minorOf(42), 4200)
  })

  test('three decimals, negatives, garbage and out-of-range amounts are refused', async ({
    assert,
  }) => {
    for (const bad of [12.123, -1, 'abc', '', null, 0, 100_000_01]) {
      await assert.rejects(() => schema.validate({ amount: bad }))
    }
  })
})
