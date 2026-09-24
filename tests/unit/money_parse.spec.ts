import { test } from '@japa/runner'
import { minorToInput, parseMoneyToMinor } from '#services/pricing/money_input'

test.group('parseMoneyToMinor', () => {
  test('parses common decimal spellings to exact integers', ({ assert }) => {
    const cases: Array<[string, number]> = [
      ['0,60', 60],
      ['0.6', 60],
      ['0.60', 60],
      ['12', 1200],
      ['12,5', 1250],
      ['12.50', 1250],
      ['1.234,56', 123_456],
      ['1,234.56', 123_456],
      ['1.234', 123_400],
      ['  7 ', 700],
      ['0.29', 29],
      ['1.15', 115],
      ['0.07', 7],
    ]
    for (const [input, minor] of cases) assert.equal(parseMoneyToMinor(input), minor, input)
  })

  test('rejects garbage, negatives, too many decimals and overflow', ({ assert }) => {
    for (const bad of [
      '',
      ' ',
      'abc',
      '-1',
      '1,2,3x',
      '1.2345',
      '0.999',
      '1e3',
      '--',
      ',5',
      '99999999999999999999',
    ]) {
      assert.isNull(parseMoneyToMinor(bad), bad)
    }
  })

  test('no float drift: every whole+cents amount round-trips', ({ assert }) => {
    for (let minor = 0; minor <= 5000; minor += 7) {
      assert.equal(parseMoneyToMinor(minorToInput(minor)), minor)
    }
    assert.equal(minorToInput(5), '0.05')
    assert.equal(minorToInput(1234), '12.34')
  })
})
