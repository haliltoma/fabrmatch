/* eslint-disable @unicorn/no-await-expression-member -- terse assertions read better inline */
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import RoleService from '#services/identity/role_service'
import { approvePayee, createManufacturer, createUser } from '#tests/helpers/order_fixtures'

test.group('Launch readiness page', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('admins see the live checklist; makers with approved details are counted', async ({
    client,
  }) => {
    const admin = await createUser('admin')
    await new RoleService().assignRole(admin, 'admin')
    const { user, profile } = await createManufacturer()
    await approvePayee('manufacturer', profile.id, user.id)
    const page = await client
      .get('/admin/launch')
      .loginAs(admin)
      .headers({ 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' })
    page.assertBodyContains({
      component: 'admin/launch/index',
      props: { ready: false },
    })
    page.assertBodyContains({
      props: { checks: [{ id: 'sales_model' }] },
    })
    const other = await createUser('seller')
    await new RoleService().assignRole(other, 'seller')
    ;(await client.get('/admin/launch').loginAs(other)).assertStatus(403)
  })
})
