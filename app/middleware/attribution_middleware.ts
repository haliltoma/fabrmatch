import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { normalizeReferralCode } from '#services/growth/referral_service'
import { readAttribution } from '#services/growth/attribution'

/** Remembers where a visitor first came from (session only) so signup and orders can be credited. */
export default class AttributionMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    if (ctx.request.method() === 'GET' && !ctx.session.has('attribution')) {
      const found = readAttribution({
        query: ctx.request.qs(),
        referrer: ctx.request.header('referer'),
        ownHost: ctx.request.hostname() ?? '',
      })
      if (found) ctx.session.put('attribution', found)
    }
    if (ctx.request.method() === 'GET') {
      const ref = normalizeReferralCode(ctx.request.qs().ref)
      if (ref) ctx.session.put('referral', ref)
    }
    return next()
  }
}
