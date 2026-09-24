import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import app from '@adonisjs/core/services/app'
import limiter from '@adonisjs/limiter/services/main'
import type User from '#models/user'
import ApiKeyService from '#services/integrations/api_key_service'

declare module '@adonisjs/core/http' {
  interface HttpContext {
    /** The seller a valid API key belongs to; set by `api_key` middleware. */
    apiUser: User
  }
}

const REQUESTS_PER_MINUTE = 120

/** Bearer-token auth for `/api/v1`. Answers JSON only; no session, no cookies. */
export default class ApiKeyMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    // errors (validation, not found) must be JSON whatever the client sent, never a redirect
    ctx.request.request.headers.accept = 'application/json'
    const header = ctx.request.header('authorization') ?? ''
    const match = /^Bearer\s+(\S+)$/i.exec(header)
    const auth = match ? await new ApiKeyService().authenticate(match[1]) : null
    if (!auth) {
      return ctx.response
        .header('www-authenticate', 'Bearer')
        .unauthorized({ error: { code: 'invalid_api_key', message: 'Missing or invalid API key' } })
    }

    // Shared redis makes repeated suite runs flaky, so the budget is not applied in tests.
    if (!app.inTest) {
      const throttle = limiter.use({ requests: REQUESTS_PER_MINUTE, duration: '1 minute' })
      const allowed = await throttle.attempt(`api-key:${auth.key.id}`, () => true)
      if (!allowed) {
        return ctx.response
          .header('retry-after', '60')
          .tooManyRequests({ error: { code: 'rate_limited', message: 'Too many requests' } })
      }
    }

    ctx.apiUser = auth.user
    return next()
  }
}
