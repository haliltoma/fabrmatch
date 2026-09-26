import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/** Cross-site POSTs from a hosted payment page back to us. */
const STATELESS_PATHS = new Set(['/payments/return'])

/**
 * The payment provider POSTs the buyer back cross-site, so the browser leaves out the
 * SameSite=Lax session cookie. The session and shield middleware would answer with a brand-new
 * session cookie and log the buyer out. Server middleware wraps the router stack, so dropping
 * every Set-Cookie here keeps the buyer's own session intact for the redirect that follows.
 */
export default class StatelessReturnMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    await next()
    if (STATELESS_PATHS.has(ctx.request.url())) ctx.response.removeHeader('set-cookie')
  }
}
