/* eslint-disable @unicorn/no-await-expression-member -- terse assertions read better inline */
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import AuditLog from '#models/audit_log'
import PricingRegion from '#models/pricing_region'
import PricingRegionMaterial from '#models/pricing_region_material'
import RoleService from '#services/identity/role_service'
import { createUser, ensureReferenceCatalog } from '#tests/helpers/order_fixtures'

const inertia = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }

test.group('admin pricing regions (P2-T9)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  async function admin() {
    const user = await createUser('admin')
    await new RoleService().assignRole(user, 'admin')
    return user
  }

  test('the page lists every region with its rules and material prices', async ({
    client,
    assert,
  }) => {
    const page = await client
      .get('/admin/pricing-regions')
      .headers(inertia)
      .loginAs(await admin())
    page.assertStatus(200)
    const { regions, materials } = page.body().props
    assert.includeMembers(
      regions.map((r: { code: string }) => r.code),
      ['TR', 'EU', 'UK', 'US', 'ROW']
    )
    const eu = regions.find((r: { code: string }) => r.code === 'EU')
    assert.include(eu.countries, 'DE')
    assert.equal(eu.multiplierPercent, 100)
    assert.isNull(eu.commissionPercent)
    assert.includeMembers(
      materials.map((m: { code: string }) => m.code),
      ['PLA', 'PETG']
    )
  })

  test('an admin sets region rules in display units, with an audit entry', async ({
    client,
    assert,
  }) => {
    const user = await admin()
    const eu = await PricingRegion.findByOrFail('code', 'EU')
    const res = await client
      .post(`/admin/pricing-regions/${eu.id}`)
      .loginAs(user)
      .withCsrfToken()
      .headers(inertia)
      .redirects(0)
      .json({
        multiplierPercent: 125,
        commissionPercent: 18,
        minOrder: 150,
        rounding: 'charm99',
        currency: 'EUR',
        countries: 'de, fr, nl',
      })
    res.assertStatus(302)
    await eu.refresh()
    assert.equal(eu.referenceMultiplierBps, 12_500)
    assert.equal(eu.commissionBps, 1800)
    assert.equal(eu.minOrderMinor, 15_000)
    assert.equal(eu.rounding, 'charm99')
    assert.deepEqual(eu.countries, ['DE', 'FR', 'NL'])
    const audit = await AuditLog.query()
      .where('action', 'pricing_region.updated')
      .where('subjectId', eu.id)
      .first()
    assert.exists(audit)

    // an empty commission goes back to the global setting
    await client
      .post(`/admin/pricing-regions/${eu.id}`)
      .loginAs(user)
      .withCsrfToken()
      .headers(inertia)
      .redirects(0)
      .json({ commissionPercent: null })
    await eu.refresh()
    assert.isNull(eu.commissionBps)
  })

  test('a country cannot sit in two regions, and the fallback keeps no list', async ({
    client,
    assert,
  }) => {
    const user = await admin()
    const us = await PricingRegion.findByOrFail('code', 'US')
    await client
      .post(`/admin/pricing-regions/${us.id}`)
      .loginAs(user)
      .withCsrfToken()
      .headers(inertia)
      .redirects(0)
      .json({ countries: 'US, DE' })
    await us.refresh()
    assert.deepEqual(us.countries, ['US'], 'DE belongs to the EU')

    const row = await PricingRegion.findByOrFail('code', 'ROW')
    await client
      .post(`/admin/pricing-regions/${row.id}`)
      .loginAs(user)
      .withCsrfToken()
      .headers(inertia)
      .redirects(0)
      .json({ countries: 'JP' })
    await row.refresh()
    assert.deepEqual(row.countries, [])
  })

  test('a per-material price is set and cleared; a new region can be added', async ({
    client,
    assert,
  }) => {
    const user = await admin()
    const uk = await PricingRegion.findByOrFail('code', 'UK')
    const post = (path: string, body: object) =>
      client.post(path).loginAs(user).withCsrfToken().headers(inertia).redirects(0).json(body)

    ;(
      await post(`/admin/pricing-regions/${uk.id}/materials`, { material: 'petg', price: 1.2 })
    ).assertStatus(302)
    const row = await PricingRegionMaterial.query()
      .where('pricingRegionId', uk.id)
      .where('material', 'PETG')
      .firstOrFail()
    assert.equal(row.pricePerGramMinor, 120)

    await post(`/admin/pricing-regions/${uk.id}/materials`, { material: 'PETG', price: null })
    assert.isNull(
      await PricingRegionMaterial.query()
        .where('pricingRegionId', uk.id)
        .where('material', 'PETG')
        .first()
    )

    ;(
      await post('/admin/pricing-regions', {
        code: 'gcc',
        name: 'Gulf',
        currency: 'USD',
        countries: 'AE, SA',
      })
    ).assertStatus(302)
    const gulf = await PricingRegion.findByOrFail('code', 'GCC')
    assert.deepEqual(gulf.countries, ['AE', 'SA'])
    assert.equal(gulf.referenceMultiplierBps, 10_000)
  })

  test('only admins reach it', async ({ client }) => {
    const buyer = await createUser('buyer')
    await new RoleService().assignRole(buyer, 'seller')
    const page = await client
      .get('/admin/pricing-regions')
      .header('accept', 'application/json')
      .loginAs(buyer)
      .redirects(0)
    page.assertStatus(403)
  })
})
