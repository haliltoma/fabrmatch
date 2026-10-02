/* eslint-disable @unicorn/no-await-expression-member -- terse assertions read better inline */
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import ManufacturerProfile from '#models/manufacturer_profile'
import PrinterMaterial from '#models/printer_material'
import CityPageService, { MIN_MAKERS_FOR_CITY_PAGE } from '#services/marketing/city_page_service'
import {
  createManufacturer,
  createPrinter,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'

const INERTIA = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }

async function maker(
  rateMinor: number,
  options: {
    city?: string
    country?: string
    material?: string
    active?: boolean
  } = {}
) {
  const { profile } = await createManufacturer({
    city: options.city ?? 'Istanbul',
    country: options.country ?? 'TR',
  })
  const printer = await createPrinter(profile, {
    material: options.material ?? 'PETG',
    isActive: options.active ?? true,
  })
  await PrinterMaterial.query()
    .where('printerId', printer.id)
    .update({
      materialCostPerKgMinor: rateMinor * 1000,
    })
  return { profile, printer }
}

test.group('city pages (M2-T3)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('below the threshold a city has no page at all and stays out of the sitemap', async ({
    client,
    assert,
  }) => {
    await maker(40)
    await maker(90)
    assert.equal(MIN_MAKERS_FOR_CITY_PAGE, 3)

    const index = await client.get('/cities').headers(INERTIA)
    index.assertStatus(200)
    assert.isFalse(index.body().props.indexable)
    assert.deepEqual(index.body().props.cities, [])

    // nothing real to say, nobody to single out: not even an unlisted page
    ;(await client.get('/cities/istanbul').headers(INERTIA)).assertStatus(404)

    const sitemap = await client.get('/sitemap.xml')
    assert.notInclude(sitemap.text(), '/cities')
  })

  test('with enough makers the city is listed with real counts and rates', async ({
    client,
    assert,
  }) => {
    const first = await maker(40)
    await maker(65)
    const last = await maker(90)
    // a foreign city gets the country in its slug; one maker there stays unlisted
    await maker(10, { city: 'Berlin', country: 'DE' })
    // only two Istanbul makers print ABS: not enough, so it must not appear
    await createPrinter(first.profile, { material: 'ABS' })
    await createPrinter(last.profile, { material: 'ABS' })

    const index = await client.get('/cities').headers(INERTIA)
    index.assertStatus(200)
    assert.isTrue(index.body().props.indexable)
    assert.deepEqual(index.body().props.cities, [
      { slug: 'istanbul', city: 'Istanbul', country: 'TR', makers: 3 },
    ])

    const page = await client.get('/cities/istanbul').headers(INERTIA)
    page.assertStatus(200)
    const { city } = page.body().props
    assert.equal(city.name, 'Istanbul')
    assert.equal(city.makers, 3)
    assert.deepEqual(city.materials, [
      { code: 'PETG', minMinor: 40, maxMinor: 90, currency: 'TRY' },
    ])

    // aggregate only: nothing about who the makers are
    const alias = (await ManufacturerProfile.findOrFail(last.profile.id)).publicAlias
    assert.notInclude(page.text(), alias)
    assert.notInclude(page.text(), 'FM-')

    const sitemap = (await client.get('/sitemap.xml')).text()
    assert.include(sitemap, '/cities</loc>')
    assert.include(sitemap, '/cities/istanbul')
    assert.notInclude(sitemap, '/cities/berlin-de')
  })

  test('inactive printers and inactive makers are not counted', async ({ assert, client }) => {
    await maker(50)
    await maker(60)
    await maker(70, { active: false })
    const { profile } = await maker(85)
    await ManufacturerProfile.query().where('id', profile.id).update({ status: 'suspended' })

    const istanbul = await new CityPageService().find('istanbul')
    assert.exists(istanbul)
    assert.isFalse(istanbul!.indexable)
    assert.isNull(istanbul!.makers)
    ;(await client.get('/cities/istanbul').headers(INERTIA)).assertStatus(404)
  })

  test('unknown cities 404; an indexable slug resolves case-insensitively', async ({
    client,
    assert,
  }) => {
    ;(await client.get('/cities/nowhere').headers(INERTIA)).assertStatus(404)
    await maker(40)
    await maker(50)
    await maker(60)
    const page = await client.get('/cities/Istanbul').headers(INERTIA)
    page.assertStatus(200)
    assert.equal(page.body().props.city.makers, 3)
  })
})
