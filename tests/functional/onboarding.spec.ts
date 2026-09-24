import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

test.group('Onboarding', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('unauthenticated user is redirected from onboarding', async ({ client }) => {
    const response = await client.get('/onboarding')
    response.assertRedirectsTo('/login')
  })

  test('unauthenticated user is redirected from seller panel', async ({ client }) => {
    const response = await client.get('/seller')
    response.assertRedirectsTo('/login')
  })

  test('unauthenticated user is redirected from maker panel', async ({ client }) => {
    const response = await client.get('/maker')
    response.assertRedirectsTo('/login')
  })

  test('unauthenticated user is redirected from admin panel', async ({ client }) => {
    const response = await client.get('/admin')
    response.assertRedirectsTo('/login')
  })
})
