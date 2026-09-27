/* eslint-disable @unicorn/no-await-expression-member -- terse assertions read better inline */
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import PricingRegion from '#models/pricing_region'
import { visitorCountry } from '#services/pricing/visitor_country'
import {
  createManufacturer,
  createPrinter,
  createStorefrontProduct,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'

const inertia = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }
const visitor = (lang: string) => ({ ...inertia, 'accept-language': lang })

test.group('regional prices while browsing (P2-T8)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('the visitor country: edge header, then browser region, then Türkiye', ({ assert }) => {
    const ctx = (headers: Record<string, string>) => ({
      request: { header: (name: string) => headers[name] ?? null },
    })
    assert.equal(visitorCountry(ctx({ 'cf-ipcountry': 'de', 'accept-language': 'en-US' })), 'DE')
    assert.equal(visitorCountry(ctx({ 'accept-language': 'en-GB,en' })), 'GB')
    assert.equal(visitorCountry(ctx({ 'accept-language': 'en' })), 'TR')
    // Cloudflare's "unknown" and Tor markers are not countries
    assert.equal(visitorCountry(ctx({ 'cf-ipcountry': 'XX', 'accept-language': 'fr-FR' })), 'FR')
    assert.equal(visitorCountry(ctx({ 'cf-ipcountry': 'T1' })), 'TR')
  })

  test('shop and product prices follow the visitor region; Türkiye is unchanged', async ({
    client,
    assert,
  }) => {
    const shop = await createStorefrontProduct({ materials: ['PLA'] })
    const listPrice = async (lang: string) =>
      (await client.get('/shop').headers(visitor(lang))).body().props.items[0].fromPriceMinor
    const productPrice = async (lang: string) =>
      (await client.get(`/shop/${shop.product.id}/desk-organizer`).headers(visitor(lang))).body()
        .props.product.options[0].unitPriceMinor

    const trBefore = await listPrice('tr-TR')
    const productTrBefore = await productPrice('tr-TR')
    await PricingRegion.query().where('code', 'EU').update({ referenceMultiplierBps: 20_000 })

    assert.equal(await listPrice('tr-TR'), trBefore)
    assert.equal(await productPrice('tr-TR'), productTrBefore)
    assert.isAbove(await listPrice('de-DE'), trBefore)
    assert.isAbove(await productPrice('de-DE'), productTrBefore)
  })

  test('the product page says when no maker serves the visitor country yet', async ({
    client,
    assert,
  }) => {
    const shop = await createStorefrontProduct({ materials: ['PLA'] })
    const { profile } = await createManufacturer({ country: 'TR' })
    await createPrinter(profile, { material: 'PLA' })
    const served = async (lang: string) =>
      (await client.get(`/shop/${shop.product.id}/desk-organizer`).headers(visitor(lang))).body()
        .props.delivery

    assert.deepEqual(await served('tr-TR'), { country: 'TR', served: true })
    assert.deepEqual(await served('de-DE'), { country: 'DE', served: false })
  })

  test('the free instant price uses the visitor region too', async ({ client, assert }) => {
    const page = await client.get('/tools/quick-quote').headers(visitor('de-DE'))
    page.assertStatus(200)
    assert.equal(page.body().props.delivery.country, 'DE')
  })
})
