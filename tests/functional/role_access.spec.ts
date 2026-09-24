import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import RoleService from '#services/identity/role_service'
import OnboardingService from '#services/identity/onboarding_service'
import { createManufacturer, createUser } from '#tests/helpers/order_fixtures'

test.group('Role access', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('seller is blocked from the manufacturer panel', async ({ client }) => {
    const user = await createUser('seller')
    await new RoleService().assignRole(user, 'seller')

    const response = await client.get('/maker/work').loginAs(user)
    response.assertStatus(403)
  })

  test('manufacturer is blocked from the seller panel', async ({ client }) => {
    const user = await createUser('maker')
    await new RoleService().assignRole(user, 'manufacturer')

    const response = await client.get('/seller/products').loginAs(user)
    response.assertStatus(403)
  })

  test('seller can access the seller panel', async ({ client }) => {
    const user = await createUser('seller')
    await new OnboardingService().createSellerProfile(user, {
      businessName: 'Test Shop',
      isCorporate: false,
    })

    const response = await client.get('/seller/products').loginAs(user)
    response.assertStatus(200)
  })

  test('manufacturer can access the work page', async ({ client }) => {
    const { user } = await createManufacturer()
    await new RoleService().assignRole(user, 'manufacturer')

    const response = await client.get('/maker/work').loginAs(user)
    response.assertStatus(200)
  })

  test('manufacturer can also buy — /orders is not role-gated', async ({ client }) => {
    const user = await createUser('maker')
    await new RoleService().assignRole(user, 'manufacturer')

    const response = await client.get('/orders').loginAs(user)
    response.assertStatus(200)
  })

  test('user without roles is sent to onboarding', async ({ client }) => {
    const user = await createUser('roleless')

    const response = await client.get('/seller/products').loginAs(user)
    response.assertRedirectsTo('/onboarding')
  })
})
