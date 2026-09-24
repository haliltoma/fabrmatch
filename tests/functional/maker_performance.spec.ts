import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import RoleService from '#services/identity/role_service'
import { createManufacturer, createUser } from '#tests/helpers/order_fixtures'

const inertia = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }

test.group('maker performance & earnings pages', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a maker sees their scorecard and earnings', async ({ client, assert }) => {
    const { user, profile } = await createManufacturer()
    await new RoleService().assignRole(user, 'manufacturer')

    const card = await client.get('/maker/performance').loginAs(user).headers(inertia)
    card.assertStatus(200)
    assert.equal(card.body().props.alias, profile.publicAlias)
    assert.equal(card.body().props.scorecard.completedJobs, 0)

    const earnings = await client.get('/maker/earnings').loginAs(user).headers(inertia)
    earnings.assertStatus(200)
    assert.deepEqual(earnings.body().props.payouts, [])
    assert.equal(earnings.body().props.meta.total, 0)
  })

  test('sellers cannot open the maker pages', async ({ client }) => {
    const seller = await createUser('seller')
    await new RoleService().assignRole(seller, 'seller')
    const response = await client.get('/maker/earnings').loginAs(seller)
    response.assertStatus(403)
  })
})
