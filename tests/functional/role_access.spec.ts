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

  test('role without a profile is sent to finish the profile, not a 500', async ({ client }) => {
    const seller = await createUser('halfseller')
    await new RoleService().assignRole(seller, 'seller')
    for (const path of ['/seller', '/seller/products', '/seller/branding']) {
      const response = await client.get(path).loginAs(seller).redirects(0)
      response.assertStatus(302)
      response.assertHeader('location', '/onboarding/profile')
    }

    const maker = await createUser('halfmaker')
    await new RoleService().assignRole(maker, 'manufacturer')
    const response = await client.get('/maker').loginAs(maker).redirects(0)
    response.assertHeader('location', '/onboarding/profile')

    const form = await client
      .get('/onboarding/profile')
      .loginAs(seller)
      .header('x-inertia', 'true')
      .header('x-inertia-version', '1')
    form.assertStatus(200)
  })

  test('profile step skips roles that already have a profile', async ({ client }) => {
    const { user } = await createManufacturer()
    await new RoleService().assignRole(user, 'manufacturer')
    await new RoleService().assignRole(user, 'seller')

    const page = await client.get('/onboarding/profile').loginAs(user).redirects(0)
    page.assertStatus(200)
    page.assertTextIncludes('seller')

    await new OnboardingService().createSellerProfile(user, {
      businessName: 'S',
      isCorporate: false,
    })
    const done = await client.get('/onboarding/profile').loginAs(user).redirects(0)
    done.assertHeader('location', '/seller')
  })

  test('user without roles is sent to onboarding', async ({ client }) => {
    const user = await createUser('roleless')

    const response = await client.get('/seller/products').loginAs(user)
    response.assertRedirectsTo('/onboarding')
  })
})
