/* eslint-disable @unicorn/no-await-expression-member -- terse assertions read better inline */
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import RoleService from '#services/identity/role_service'
import { createUser } from '#tests/helpers/order_fixtures'

const inertia = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }

test.group('message tests over HTTP', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a landing page shows one of the two headlines and records one exposure', async ({
    client,
    assert,
  }) => {
    const page = await client.get('/for-makers').headers(inertia)
    page.assertStatus(200)
    assert.oneOf(page.body().props.variant, ['A', 'B'])
    const rows = await db.from('experiment_events')
    assert.lengthOf(rows, 1)
    assert.equal(rows[0].experiment, 'maker_headline')
    assert.equal(rows[0].variant, page.body().props.variant)

    const sellers = await client.get('/for-sellers').headers(inertia)
    assert.oneOf(sellers.body().props.variant, ['A', 'B'])
    assert.equal(
      (await db.from('experiment_events').where('experiment', 'seller_headline')).length,
      1
    )
  })

  test('the home page shows one hero call to action and records the exposure', async ({
    client,
    assert,
  }) => {
    const page = await client.get('/').headers(inertia)
    page.assertStatus(200)
    assert.oneOf(page.body().props.ctaVariant, ['A', 'B'])
    const rows = await db.from('experiment_events').where('experiment', 'home_cta')
    assert.lengthOf(rows, 1)
    assert.equal(rows[0].variant, page.body().props.ctaVariant)
  })

  test('crawlers do not count as visitors', async ({ client, assert }) => {
    const page = await client
      .get('/for-makers')
      .headers({ ...inertia, 'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' })
    page.assertStatus(200)
    assert.lengthOf(await db.from('experiment_events'), 0)
  })

  test('the results page is for admins only', async ({ client, assert }) => {
    const admin = await createUser('admin')
    await new RoleService().assignRole(admin, 'admin')
    const page = await client.get('/admin/experiments').headers(inertia).loginAs(admin)
    page.assertStatus(200)
    assert.deepEqual(
      page.body().props.experiments.map((e: { key: string }) => e.key),
      ['home_cta', 'maker_headline', 'seller_headline']
    )
    const member = await createUser('member')
    await new RoleService().assignRole(member, 'seller')
    ;(await client.get('/admin/experiments').loginAs(member)).assertStatus(403)
  })
})
