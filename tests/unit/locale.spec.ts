import { test } from '@japa/runner'
import { pickLocale } from '#services/i18n/locale'

test.group('locale choice (R5-T5)', () => {
  test('the cookie wins over the browser language', ({ assert }) => {
    assert.equal(pickLocale('en', 'tr-TR,tr;q=0.9'), 'en')
    assert.equal(pickLocale('tr', 'en-US'), 'tr')
  })

  test('without a cookie the first supported Accept-Language is used, else English', ({
    assert,
  }) => {
    assert.equal(pickLocale(undefined, 'tr-TR,tr;q=0.9,en;q=0.8'), 'tr')
    assert.equal(pickLocale(undefined, 'de-DE,de;q=0.9,tr;q=0.5'), 'tr')
    assert.equal(pickLocale(undefined, 'fr-FR,de'), 'en')
    assert.equal(pickLocale(undefined, undefined), 'en')
  })

  test('junk in the cookie or header is ignored', ({ assert }) => {
    assert.equal(pickLocale('xx', ';;;'), 'en')
    assert.equal(pickLocale({}, 'TR'), 'tr')
  })
})
