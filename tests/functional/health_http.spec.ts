import { test } from '@japa/runner'

test.group('/health endpoint', () => {
  test('is public and returns only checks and alarm names', async ({ client, assert }) => {
    const response = await client.get('/health')
    response.assertStatus(200)
    assert.property(response.body(), 'checks')
    assert.isArray(response.body().alarms)
    assert.oneOf(response.body().status, ['ok', 'degraded'])
  })
})
