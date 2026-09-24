import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import fabrmatchConfig from '#config/fabrmatch'
import RoleService from '#services/identity/role_service'
import SettingsService from '#services/settings/settings_service'
import { createUser, ensureReferenceCatalog } from '#tests/helpers/order_fixtures'

test.group('admin settings', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.teardown(() => new SettingsService().syncFromDatabase())

  test('non-admins are refused', async ({ client }) => {
    const user = await createUser('seller')
    await new RoleService().assignRole(user, 'seller')
    const response = await client.get('/admin/settings').loginAs(user)
    response.assertStatus(403)
  })

  test('an admin can change and reset a setting', async ({ client, assert }) => {
    const admin = await createUser('admin')
    await new RoleService().assignRole(admin, 'admin')
    const inertia = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }

    const page = await client.get('/admin/settings').loginAs(admin).headers(inertia)
    page.assertStatus(200)
    assert.isArray(page.body().props.settings)

    const save = await client
      .post('/admin/settings')
      .loginAs(admin)
      .withCsrfToken()
      .headers(inertia)
      .redirects(0)
      .json({ key: 'orders.autoConfirmDays', value: 10 })
    save.assertStatus(302)
    assert.equal(fabrmatchConfig.orders.autoConfirmDays, 10)

    const reset = await client
      .post('/admin/settings/reset')
      .loginAs(admin)
      .withCsrfToken()
      .headers(inertia)
      .redirects(0)
      .json({ key: 'orders.autoConfirmDays' })
    reset.assertStatus(302)
    assert.equal(fabrmatchConfig.orders.autoConfirmDays, 7)
  })

  test('an invalid value is rejected without changing anything', async ({ client, assert }) => {
    const admin = await createUser('admin')
    await new RoleService().assignRole(admin, 'admin')
    const response = await client
      .post('/admin/settings')
      .loginAs(admin)
      .withCsrfToken()
      .headers({ accept: 'application/json' })
      .json({ key: 'orders.autoConfirmDays', value: 999 })
    assert.notEqual(response.status(), 200)
    assert.equal(fabrmatchConfig.orders.autoConfirmDays, 7)
  })
})

test.group('admin materials catalogue', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('an admin can add a material and retire a colour', async ({ client, assert }) => {
    const admin = await createUser('admin')
    await new RoleService().assignRole(admin, 'admin')
    const inertia = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }

    const page = await client.get('/admin/materials').loginAs(admin).headers(inertia)
    page.assertStatus(200)
    assert.isAbove(page.body().props.materials.length, 5)

    const add = await client
      .post('/admin/materials')
      .loginAs(admin)
      .withCsrfToken()
      .headers(inertia)
      .redirects(0)
      .json({ code: 'PC', name: 'Polycarbonate', technology: 'FDM' })
    add.assertStatus(302)

    const grey = page.body().props.colors.find((c: { name: string }) => c.name === 'Grey')
    const retire = await client
      .post(`/admin/colors/${grey.id}/toggle`)
      .loginAs(admin)
      .withCsrfToken()
      .headers(inertia)
      .redirects(0)
      .json({ isActive: false })
    retire.assertStatus(302)
    const after = await client.get('/admin/materials').loginAs(admin).headers(inertia)
    const codes = after.body().props.materials.map((m: { code: string }) => m.code)
    assert.include(codes, 'PC')
    const retired = after.body().props.colors.find((c: { name: string }) => c.name === 'Grey')
    assert.isFalse(retired.isActive)
  })
})

test.group('account privacy pages', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('export downloads JSON for the signed-in user only; delete needs the confirm word', async ({
    client,
    assert,
  }) => {
    const user = await createUser('seller')
    await new RoleService().assignRole(user, 'seller')
    const inertia = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }

    const page = await client.get('/account/privacy').loginAs(user).headers(inertia)
    page.assertStatus(200)
    assert.deepEqual(page.body().props.blockers, [])

    const file = await client.get('/account/privacy/export').loginAs(user)
    file.assertStatus(200)
    assert.include(file.header('content-disposition'), 'attachment')
    assert.equal(file.body().account.email, user.email)

    const guest = await client.get('/account/privacy/export').redirects(0)
    guest.assertStatus(302)

    const noConfirm = await client
      .post('/account/privacy/delete')
      .loginAs(user)
      .withCsrfToken()
      .headers(inertia)
      .redirects(0)
      .json({ password: 'password123', confirm: 'yes' })
    assert.notEqual(noConfirm.header('location'), '/')
  })
})
