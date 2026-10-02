import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import MakerCostProfile from '#models/maker_cost_profile'
import RoleService from '#services/identity/role_service'
import { createManufacturer, createUser } from '#tests/helpers/order_fixtures'

const inertia = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }

test.group('maker costs page (Paket V)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a maker sees the reference costs, saves their own, and a profit off-limits is refused', async ({
    client,
    assert,
  }) => {
    const { user, profile } = await createManufacturer()
    await new RoleService().assignRole(user, 'manufacturer')
    const page = await client.get('/maker/costs').loginAs(user).headers(inertia)
    page.assertStatus(200)
    assert.equal(page.body().component, 'maker/costs')
    assert.isFalse(page.body().props.costs.saved)

    const costs = {
      hourlyRateMinor: 1500,
      setupMinor: 3000,
      wasteBps: 1000,
      failureBps: 500,
      profitBps: 2800,
    }
    const saved = await client.post('/maker/costs').loginAs(user).withCsrfToken().form(costs)
    saved.assertRedirectsTo('/maker/costs')
    const row = await MakerCostProfile.findByOrFail('manufacturerProfileId', profile.id)
    assert.equal(row.profitBps, 2800)

    await client
      .post('/maker/costs')
      .loginAs(user)
      .withCsrfToken()
      .header('referer', '/maker/costs')
      .form({ ...costs, profitBps: 9000 })
    await row.refresh()
    assert.equal(row.profitBps, 2800, 'a profit above the admin maximum is not saved')
  })

  test('other roles cannot open the page', async ({ client }) => {
    const buyer = await createUser('costs-buyer')
    await new RoleService().assignRole(buyer, 'seller')
    const res = await client.get('/maker/costs').loginAs(buyer)
    res.assertStatus(403)
  })
})
