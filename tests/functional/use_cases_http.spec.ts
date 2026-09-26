import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import RoleService from '#services/identity/role_service'
import { USE_CASES } from '#services/marketing/use_case_service'
import {
  createManufacturer,
  createPrinter,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'

const inertia = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }

async function makers(n: number, material: string) {
  for (let i = 0; i < n; i++) {
    const m = await createManufacturer()
    await new RoleService().assignRole(m.user, 'manufacturer')
    await createPrinter(m.profile, { material })
  }
}

test.group('use-case pages (M2-T3)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('every use case has a page with real prices and editorial text', async ({
    client,
    assert,
  }) => {
    const index = await client.get('/use-cases').headers(inertia)
    index.assertStatus(200)
    assert.lengthOf(index.body().props.useCases, USE_CASES.length)

    for (const u of USE_CASES) {
      const page = await client.get(`/use-cases/${u.slug}`).headers(inertia)
      page.assertStatus(200)
      const { useCase, html } = page.body().props
      assert.isString(html, `${u.slug} has editorial content`)
      assert.deepEqual(
        useCase.prices.map((p: { quantity: number }) => p.quantity),
        u.quantities
      )
      for (const p of useCase.prices) {
        assert.isAbove(p.totalMinor, 0)
        assert.equal(p.perPieceMinor * p.quantity, p.totalMinor)
      }
      // more pieces share one parcel: never dearer per piece
      assert.isAtMost(useCase.prices.at(-1).perPieceMinor, useCase.prices[0].perPieceMinor)
    }
    const missing = await client.get('/use-cases/nope')
    missing.assertStatus(404)
  })

  test('a page is noindex until enough makers print its material', async ({ client, assert }) => {
    const before = await client.get('/use-cases/spare-parts').headers(inertia)
    assert.isFalse(before.body().props.indexable)
    assert.isNull(before.body().props.useCase.makers)
    const sitemapBefore = await client.get('/sitemap.xml')
    assert.notInclude(sitemapBefore.text(), '/use-cases/spare-parts')

    await makers(3, 'PETG')
    const after = await client.get('/use-cases/spare-parts').headers(inertia)
    assert.isTrue(after.body().props.indexable)
    assert.equal(after.body().props.useCase.makers, 3)
    const sitemap = await client.get('/sitemap.xml')
    assert.include(sitemap.text(), '/use-cases/spare-parts')
  })
})
