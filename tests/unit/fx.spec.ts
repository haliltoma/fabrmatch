import { test } from '@japa/runner'
import {
  convertMinor,
  decimalToMicro,
  rateFromTryPerUnit,
  toBaseMinor,
  withMargin,
} from '#services/pricing/fx'
import { StaticFxProvider, parseTcmb } from '#services/pricing/fx_provider'

const RATE_40 = rateFromTryPerUnit(decimalToMicro('40')) // 0.025 USD per TRY

test.group('fx maths', () => {
  test('a decimal string becomes exact micro-units, anything else is refused', ({ assert }) => {
    assert.equal(decimalToMicro('41.1734'), 41_173_400n)
    assert.equal(decimalToMicro('41,17'), 41_170_000n)
    assert.equal(decimalToMicro('7'), 7_000_000n)
    assert.equal(decimalToMicro('0.1234567'), 123_456n)
    for (const bad of ['', 'abc', '-1', '1e5', '1.2.3']) {
      assert.throws(() => decimalToMicro(bad), /Not a decimal number/)
    }
  })

  test('converting is exact integer maths with round-half-up', ({ assert }) => {
    assert.equal(RATE_40, 25_000_000n)
    assert.equal(convertMinor(10_000, RATE_40), 250) // 100.00 TRY → 2.50 USD
    assert.equal(convertMinor(0, RATE_40), 0)
    assert.equal(convertMinor(20, RATE_40), 1) // 0.5 rounds up
    assert.equal(convertMinor(19, RATE_40), 0) // 0.475 rounds down
    assert.equal(toBaseMinor(250, RATE_40), 10_000)
    // large amounts stay exact: 1e12 minor units would overflow a float multiplication by 1e9
    assert.equal(convertMinor(1_000_000_000_000, RATE_40), 25_000_000_000)
  })

  test('the buffer only ever makes the buyer pay more', ({ assert }) => {
    const widened = withMargin(RATE_40, 300)
    assert.isTrue(widened > RATE_40)
    assert.isTrue(convertMinor(1_000_000, widened) > convertMinor(1_000_000, RATE_40))
    assert.equal(withMargin(RATE_40, 0), RATE_40)
  })

  test('rates need to be positive', ({ assert }) => {
    assert.throws(() => rateFromTryPerUnit(0n))
  })
})

const TCMB = `<?xml version="1.0" encoding="UTF-8"?>
<Tarih_Date Tarih="24.09.2026" Date="09/24/2026" Bulten_No="2026/180">
  <Currency CrossOrder="0" Kod="USD" CurrencyCode="USD">
    <Isim>ABD DOLARI</Isim><Unit>1</Unit>
    <ForexBuying>41.0000</ForexBuying><ForexSelling>41.2500</ForexSelling>
  </Currency>
  <Currency CrossOrder="1" Kod="EUR" CurrencyCode="EUR">
    <Isim>EURO</Isim><Unit>1</Unit>
    <ForexBuying>44.0000</ForexBuying><ForexSelling>44.5000</ForexSelling>
  </Currency>
  <Currency CrossOrder="9" Kod="JPY" CurrencyCode="JPY">
    <Isim>JAPON YENI</Isim><Unit>100</Unit>
    <ForexBuying>27.0000</ForexBuying><ForexSelling>27.2000</ForexSelling>
  </Currency>
</Tarih_Date>`

test.group('rate providers', () => {
  test('the central-bank file is parsed into per-TRY rates for the currencies we support', ({
    assert,
  }) => {
    const snapshot = parseTcmb(TCMB)
    assert.equal(snapshot.asOf, '2026-09-24')
    assert.equal(snapshot.source, 'tcmb')
    assert.sameMembers(Object.keys(snapshot.rates), ['USD', 'EUR']) // GBP absent, JPY unsupported
    // 1 / 41.25 = 0.024242424…
    assert.equal(snapshot.rates.USD, 24_242_424n)
  })

  test('a broken file is an error, never a silent zero rate', ({ assert }) => {
    assert.throws(() => parseTcmb('<html>oops</html>'))
    assert.throws(() => parseTcmb('<Tarih_Date Tarih="24.09.2026"></Tarih_Date>'))
  })

  test('the static provider gives fixed development rates', async ({ assert }) => {
    const snapshot = await new StaticFxProvider().fetch()
    assert.equal(snapshot.rates.USD, RATE_40)
    assert.equal(snapshot.source, 'static')
  })
})
