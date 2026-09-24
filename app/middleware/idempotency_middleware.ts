import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import redis from '@adonisjs/redis/services/main'

const TTL_SECONDS = 24 * 60 * 60
const KEY_PATTERN = /^[A-Za-z0-9_-]{8,80}$/

/**
 * A repeated POST with the same `Idempotency-Key` (double click, retry after a network drop) gets
 * the first answer back instead of doing the work twice. The first request claims the key; a
 * second one that arrives while the first is still running gets 409. Requests without a key pass
 * through untouched. Keys are per user and per route.
 */
export default class IdempotencyMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const key = ctx.request.header('idempotency-key')
    if (!key) return next()
    if (!KEY_PATTERN.test(key)) {
      return ctx.response.badRequest({
        error: 'Idempotency-Key must be 8–80 letters, digits, - or _',
      })
    }

    const scope = `idem:${ctx.auth.user?.id ?? 'anon'}:${ctx.route?.pattern ?? ctx.request.url()}:${key}`
    const claimed = await redis.set(scope, 'pending', 'EX', TTL_SECONDS, 'NX')
    if (claimed !== 'OK') {
      const stored = await redis.get(scope)
      if (stored && stored !== 'pending') {
        const saved = JSON.parse(stored) as { status: number; location: string | null }
        if (saved.location) return ctx.response.status(saved.status).redirect(saved.location)
        return ctx.response.status(saved.status).send({ ok: true, replayed: true })
      }
      return ctx.response.status(409).send({ error: 'This request is already being processed' })
    }

    try {
      const output = await next()
      const status = ctx.response.getStatus()
      // failed attempts (server errors, refusals, flashed validation/domain errors) must stay retryable
      const flashed =
        ctx.session.responseFlashMessages.has('error') ||
        ctx.session.responseFlashMessages.has('errorsBag')
      if (status >= 400 || flashed) {
        await redis.del(scope)
      } else {
        const location = ctx.response.getHeader('location')
        await redis.set(
          scope,
          JSON.stringify({ status, location: location ? String(location) : null }),
          'EX',
          TTL_SECONDS
        )
      }
      return output
    } catch (error) {
      await redis.del(scope)
      throw error
    }
  }
}
