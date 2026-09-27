import { test } from '@japa/runner'
import {
  countryFromAcceptLanguage,
  currencyForCountry,
  pickDisplayCurrency,
} from '#services/pricing/display_currency'
import { convertMinor } from '#services/pricing/fx'

const ALL = ['TRY', 'USD', 'EUR', 'GBP']

test.group('display currency (P1-T1)', () => {
  test('countries map to their currency; unknown ones have none', ({ assert }) => {
    assert.equal(currencyForCountry('TR'), 'TRY')
    assert.equal(currencyForCountry('us'), 'USD')
    assert.equal(currencyForCountry('GB'), 'GBP')
    for (const eurozone of ['DE', 'FR', 'NL', 'IT', 'ES', 'AT', 'IE', 'CY', 'GR']) {
      assert.equal(currencyForCountry(eurozone), 'EUR', eurozone)
    }
    assert.isNull(currencyForCountry('JP'))
    assert.isNull(currencyForCountry(''))
  })

  test('the region comes from the first Accept-Language tag that has one', ({ assert }) => {
    assert.equal(countryFromAcceptLanguage('en-GB,en;q=0.9'), 'GB')
    assert.equal(countryFromAcceptLanguage('en,de-DE;q=0.8'), 'DE')
    assert.equal(countryFromAcceptLanguage('tr-tr'), 'TR')
    assert.isNull(countryFromAcceptLanguage('en'))
    assert.isNull(countryFromAcceptLanguage(null))
    // script subtags are not regions
    assert.equal(countryFromAcceptLanguage('zh-Hant-TW'), 'TW')
  })

  test('explicit choice > edge country > browser region > language default', ({ assert }) => {
    const base = { available: ALL, locale: 'en' as const }
    assert.equal(pickDisplayCurrency({ ...base, cookie: 'EUR', edgeCountry: 'US' }), 'EUR')
    assert.equal(
      pickDisplayCurrency({ ...base, edgeCountry: 'GB', acceptLanguage: 'en-US' }),
      'GBP'
    )
    assert.equal(pickDisplayCurrency({ ...base, acceptLanguage: 'de-DE,de' }), 'EUR')
    assert.equal(pickDisplayCurrency({ ...base, acceptLanguage: 'en' }), 'USD')
    assert.equal(pickDisplayCurrency({ ...base, locale: 'tr', acceptLanguage: 'tr' }), 'TRY')
    // a country whose currency we cannot show falls through to the language default
    assert.equal(pickDisplayCurrency({ ...base, edgeCountry: 'JP' }), 'USD')
  })

  test('only currencies we can show are picked; TRY is the last resort', ({ assert }) => {
    const onlyTry = { available: ['TRY'], locale: 'en' as const }
    assert.equal(pickDisplayCurrency({ ...onlyTry, cookie: 'USD', acceptLanguage: 'en-US' }), 'TRY')
    assert.equal(
      pickDisplayCurrency({ available: ['TRY', 'EUR'], locale: 'en', cookie: 'XYZ' }),
      'TRY'
    )
    assert.equal(
      pickDisplayCurrency({ available: ['TRY', 'EUR'], locale: 'en', acceptLanguage: 'fr-FR' }),
      'EUR'
    )
  })

  test('the browser converts exactly like the server (integer, half-up)', async ({ assert }) => {
    const { convertTryMinor } = (await import(
      new URL('../../inertia/lib/money_math.ts', import.meta.url).href
    )) as { convertTryMinor: (minor: number, rateE9: string) => number }
    const rate = 30_303_030n // ~1 TRY = 0.0303 USD, ×1e9
    for (const minor of [0, 1, 99, 1417, 250_000, 9_999_999]) {
      assert.equal(convertTryMinor(minor, rate.toString()), convertMinor(minor, rate), `${minor}`)
    }
  })
})
