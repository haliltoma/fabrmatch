import { test } from '@japa/runner'
import { isValidIban, maskIban, normalizeIban } from '#services/identity/iban'

test.group('IBAN', () => {
  test('real example numbers pass, in any spacing and case', ({ assert }) => {
    for (const iban of [
      'TR33 0006 1005 1978 6457 8413 26',
      'tr330006100519786457841326',
      'DE89 3704 0044 0532 0130 00',
      'GB82 WEST 1234 5698 7654 32',
      'FR14 2004 1010 0505 0001 3M02 606',
    ]) {
      assert.isTrue(isValidIban(iban), iban)
    }
  })

  test('a wrong digit, wrong length, unknown country or junk is refused', ({ assert }) => {
    for (const bad of [
      'TR33 0006 1005 1978 6457 8413 27', // check digits fail
      'TR33 0006 1005 1978 6457 8413', // too short
      'DE89 3704 0044 0532 0130 0000', // too long
      'XX89 3704 0044 0532 0130 00', // unknown country
      '3704 0044 0532 0130 00',
      'TR33-0006-1005-1978-6457-8413-26',
      '',
    ]) {
      assert.isFalse(isValidIban(bad), bad)
    }
  })

  test('the mask keeps the country, check digits and last two characters', ({ assert }) => {
    assert.equal(normalizeIban(' tr33 0006 '), 'TR330006')
    const masked = maskIban('TR330006100519786457841326')
    assert.isTrue(masked.startsWith('TR33'))
    assert.isTrue(masked.endsWith('26'))
    assert.notInclude(masked, '0006')
    assert.notInclude(masked, '7841')
  })
})
