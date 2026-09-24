/* eslint-disable @unicorn/no-await-expression-member -- terse assertions read better inline */
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import ManufacturerProfile from '#models/manufacturer_profile'
import PrinterMaterial from '#models/printer_material'
import ContentService from '#services/content/content_service'
import MaterialPageService, {
  MIN_MAKERS_FOR_MATERIAL_PAGE,
} from '#services/marketing/material_page_service'
import {
  createManufacturer,
  createPrinter,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'

const INERTIA = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }

async function maker(material: string, rateMinor: number, options: { active?: boolean } = {}) {
  const { profile } = await createManufacturer()
  const printer = await createPrinter(profile, { material, isActive: options.active ?? true })
  await PrinterMaterial.query()
    .where('printerId', printer.id)
    .update({ pricePerGramMinor: rateMinor })
  return { profile, printer }
}

test.group('material pages', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('without enough makers a page shows no numbers, is noindex and stays out of the sitemap', async ({
    client,
    assert,
  }) => {
    await maker('PLA', 40)
    await maker('PLA', 90)
    assert.equal(MIN_MAKERS_FOR_MATERIAL_PAGE, 3)

    const page = await client.get('/materials/pla').headers(INERTIA)
    page.assertStatus(200)
    const { material, indexable } = page.body().props
    assert.isNull(material.makers)
    assert.isNull(material.rate)
    assert.isFalse(indexable)

    const sitemap = await client.get('/sitemap.xml')
    assert.notInclude(sitemap.text(), '/materials')
  })

  test('with enough makers it shows a real count and range, is indexable and listed', async ({
    client,
    assert,
  }) => {
    await maker('PETG', 40)
    await maker('PETG', 65)
    const last = await maker('PETG', 90)
    await maker('PLA', 10)

    const page = await client.get('/materials/petg').headers(INERTIA)
    page.assertStatus(200)
    const { material, indexable } = page.body().props
    assert.equal(material.makers, 3)
    assert.deepEqual(material.rate, { minMinor: 40, maxMinor: 90, currency: 'TRY' })
    assert.isTrue(indexable)

    // aggregate only: nothing about who the makers are
    const alias = (await ManufacturerProfile.findOrFail(last.profile.id)).publicAlias
    assert.notInclude(page.text(), alias)
    assert.notInclude(page.text().toLowerCase(), 'istanbul')

    const sitemap = (await client.get('/sitemap.xml')).text()
    assert.include(sitemap, '/materials/petg')
    assert.include(sitemap, '<loc>')
    assert.notInclude(sitemap, '/materials/pla<')
  })

  test('inactive printers and inactive makers are not counted', async ({ assert }) => {
    await maker('ABS', 50)
    await maker('ABS', 60)
    await maker('ABS', 70, { active: false })
    const { profile } = await maker('ABS', 80)
    await ManufacturerProfile.query().where('id', profile.id).update({ status: 'suspended' })

    const abs = await new MaterialPageService().find('ABS')
    assert.isNull(abs?.makers)
    assert.isFalse(abs!.indexable)
  })

  test('the index page and unknown materials behave', async ({ client, assert }) => {
    const index = await client.get('/materials').headers(INERTIA)
    index.assertStatus(200)
    assert.isFalse(index.body().props.indexable)
    const slugs = index.body().props.materials.map((m: { slug: string }) => m.slug)
    assert.includeMembers(slugs, ['pla', 'petg', 'abs', 'tpu', 'nylon', 'resin'])
    ;(await client.get('/materials/unobtainium').headers(INERTIA)).assertStatus(404)
  })

  test('every seeded material has editorial text and its links resolve', async ({ assert }) => {
    const content = new ContentService()
    const posts = new Set((await content.list('blog')).map((p) => `/blog/${p.slug}`))
    const terms = new Set((await content.list('glossary')).map((t) => `/glossary/${t.slug}`))
    const materials = await new MaterialPageService().list()
    for (const m of materials) {
      const entry = await content.find('materials', m.slug)
      assert.isNotNull(entry, `${m.slug} has editorial text`)
      for (const [, href] of entry!.html.matchAll(/href="([^"]+)"/g)) {
        assert.isTrue(posts.has(href) || terms.has(href), `${m.slug} links to unknown ${href}`)
      }
    }
  })
})
