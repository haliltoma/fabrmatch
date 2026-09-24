import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import app from '@adonisjs/core/services/app'
import limiter from '@adonisjs/limiter/services/main'

export interface ThrottleOptions {
  /** Bucket name; requests share a budget per name + caller. */
  name: string
  requests: number
  duration: string
}

/** Per-user (or per-IP when anonymous) request budget. Exceeding it answers 429. */
export default class ThrottleMiddleware {
  async handle(ctx: HttpContext, next: NextFn, options: ThrottleOptions) {
    // Shared redis + one loopback IP would make repeated suite runs flaky; only `test:` buckets bite.
    if (app.inTest && !options.name.startsWith('test:')) return next()
    const caller = ctx.auth.user?.id ? `u${ctx.auth.user.id}` : `ip${ctx.request.ip()}`
    const throttle = limiter.use({ requests: options.requests, duration: options.duration })
    await throttle.consume(`throttle:${options.name}:${caller}`)
    return next()
  }
}
