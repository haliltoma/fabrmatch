import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import ThrottleMiddleware from '#middleware/throttle_middleware'

function fakeCtx(userId: number | null, ip = '203.0.113.9') {
  return {
    auth: { user: userId ? { id: userId } : null },
    request: { ip: () => ip },
  } as never
}

test.group('ThrottleMiddleware', () => {
  test('allows the budget, then answers 429 for that caller only', async ({ assert }) => {
    const middleware = new ThrottleMiddleware()
    const options = { name: `test:${randomUUID()}`, requests: 2, duration: '1 minute' }
    const next = async () => 'ok'

    assert.equal(await middleware.handle(fakeCtx(1), next, options), 'ok')
    assert.equal(await middleware.handle(fakeCtx(1), next, options), 'ok')
    await assert.rejects(() => middleware.handle(fakeCtx(1), next, options))
    assert.equal(await middleware.handle(fakeCtx(2), next, options), 'ok')
  })

  test('anonymous callers are keyed by IP', async ({ assert }) => {
    const middleware = new ThrottleMiddleware()
    const options = { name: `test:${randomUUID()}`, requests: 1, duration: '1 minute' }
    const next = async () => 'ok'

    assert.equal(await middleware.handle(fakeCtx(null, '198.51.100.1'), next, options), 'ok')
    await assert.rejects(() => middleware.handle(fakeCtx(null, '198.51.100.1'), next, options))
    assert.equal(await middleware.handle(fakeCtx(null, '198.51.100.2'), next, options), 'ok')
  })
})
