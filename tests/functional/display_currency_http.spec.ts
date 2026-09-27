import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'
import FxService from '#services/pricing/fx_service'
import { StaticFxProvider } from '#services/pricing/fx_provider'
import { ensureReferenceCatalog } from '#tests/helpers/order_fixtures'

const inertia = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }

test.group('display currency over HTTP (P1-T2)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())
  group.each.setup(async () => {
    await db.from('fx_rates').delete()
  })

  test('with fresh rates the browser region decides, and the rates travel with the page', async ({
    client,
    assert,
  }) => {
    await new FxService().refresh(new StaticFxProvider())
    const page = await client.get('/').headers({ ...inertia, 'accept-language': 'en-GB,en;q=0.9' })
    page.assertStatus(200)
    const { money: currency } = page.body().props
    assert.equal(currency.display, 'GBP')
    assert.equal(currency.charge, 'TRY')
    assert.match(currency.rates.GBP, /^\d+$/)
    // mid rate: 1 TRY = 1/52 GBP → ~19 230 769 ×1e9, no FX buffer on browse prices
    assert.closeTo(Number(currency.rates.GBP), 19_230_769, 2)

    const turkish = await client.get('/').headers({ ...inertia, 'accept-language': 'tr-TR' })
    assert.equal(turkish.body().props.money.display, 'TRY')
  })

  test('without rates everything stays in TRY', async ({ client, assert }) => {
    const page = await client.get('/').headers({ ...inertia, 'accept-language': 'en-US' })
    assert.equal(page.body().props.money.display, 'TRY')
    assert.deepEqual(page.body().props.money.rates, {})
  })

  test('rates older than a week are not used for display', async ({ client, assert }) => {
    await new FxService().refresh(new StaticFxProvider())
    await db.from('fx_rates').update({ created_at: new Date(Date.now() - 8 * 86_400_000) })
    const page = await client.get('/').headers({ ...inertia, 'accept-language': 'en-US' })
    assert.equal(page.body().props.money.display, 'TRY')
  })

  test('the visitor can pick a currency; unknown codes are refused', async ({ client, assert }) => {
    await new FxService().refresh(new StaticFxProvider())
    const set = await client
      .post('/currency')
      .withCsrfToken()
      .headers({ referer: '/' })
      .form({ currency: 'EUR' })
      .redirects(0)
    set.assertStatus(302)
    assert.include(String(set.headers()['set-cookie']), 'fm_currency=')

    const page = await client
      .get('/')
      .headers({ ...inertia, 'accept-language': 'en-US' })
      .withPlainCookie('fm_currency', 'EUR')
    assert.equal(page.body().props.money.display, 'EUR')

    const bad = await client
      .post('/currency')
      .withCsrfToken()
      .headers({ referer: '/' })
      .form({ currency: 'XYZ' })
      .redirects(0)
    assert.notInclude(String(bad.headers()['set-cookie'] ?? ''), 'fm_currency=')
  })
})
