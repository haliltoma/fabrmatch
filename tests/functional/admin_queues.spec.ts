import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import ManufacturerProfile from '#models/manufacturer_profile'
import RoleService from '#services/identity/role_service'
import { createManufacturer, createUser } from '#tests/helpers/order_fixtures'

const inertia = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }

test.group('admin queues', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('non-admins are refused', async ({ client }) => {
    const user = await createUser('seller')
    await new RoleService().assignRole(user, 'seller')
    const response = await client.get('/admin/queues').loginAs(user)
    response.assertStatus(403)
  })

  test('an admin sees waiting makers and can approve one', async ({ client, assert }) => {
    const admin = await createUser('admin')
    await new RoleService().assignRole(admin, 'admin')
    const maker = await createManufacturer()
    await ManufacturerProfile.query().where('id', maker.profile.id).update({ status: 'pending' })

    const page = await client.get('/admin/queues').loginAs(admin).headers(inertia)
    page.assertStatus(200)
    const { pendingMakers } = page.body().props
    assert.lengthOf(pendingMakers, 1)
    assert.equal(pendingMakers[0].alias, maker.profile.publicAlias)

    const decide = await client
      .post(`/admin/queues/makers/${maker.profile.id}`)
      .loginAs(admin)
      .withCsrfToken()
      .headers(inertia)
      .redirects(0)
      .json({ decision: 'approve' })
    decide.assertStatus(302)
    const reloaded = await ManufacturerProfile.findOrFail(maker.profile.id)
    assert.equal(reloaded.status, 'active')
  })

  test('the dashboard carries the queue counters', async ({ client, assert }) => {
    const admin = await createUser('admin')
    await new RoleService().assignRole(admin, 'admin')
    const page = await client.get('/admin').loginAs(admin).headers(inertia)
    page.assertStatus(200)
    assert.deepEqual(page.body().props.queues, {
      unmatched: 0,
      overdue: 0,
      paymentReviews: 0,
      reconcile: 0,
      pendingMakers: 0,
      fraud: 0,
      reports: 0,
      chargebacks: 0,
      support: 0,
      shopPhotos: 0,
    })
  })
})

test.group('admin makers', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('an admin can pin a tier and hand it back', async ({ client, assert }) => {
    const admin = await createUser('admin')
    await new RoleService().assignRole(admin, 'admin')
    const maker = await createManufacturer()

    const page = await client.get('/admin/makers').loginAs(admin).headers(inertia)
    page.assertStatus(200)
    assert.equal(page.body().props.makers[0].alias, maker.profile.publicAlias)

    const pin = await client
      .post(`/admin/makers/${maker.profile.id}/tier`)
      .loginAs(admin)
      .withCsrfToken()
      .headers(inertia)
      .redirects(0)
      .json({ tier: 3 })
    pin.assertStatus(302)
    const pinned = await ManufacturerProfile.findOrFail(maker.profile.id)
    assert.equal(pinned.trustTier, 3)
    assert.isTrue(pinned.trustTierLocked)

    const unlock = await client
      .post(`/admin/makers/${maker.profile.id}/tier/unlock`)
      .loginAs(admin)
      .withCsrfToken()
      .headers(inertia)
      .redirects(0)
    unlock.assertStatus(302)
    const freed = await ManufacturerProfile.findOrFail(maker.profile.id)
    assert.isFalse(freed.trustTierLocked)
    assert.equal(freed.trustTier, 3, 'partner status is kept')
  })
})
