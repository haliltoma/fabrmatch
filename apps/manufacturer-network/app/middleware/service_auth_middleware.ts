import env from '#start/env'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { timingSafeEqual } from 'node:crypto'

/**
 * Sistem A → Sistem B servis çağrılarını doğrular: `Authorization: Bearer {SISTEM_B_API_KEY}`
 * (Sistem A'daki adı; burada SISTEM_A_INBOUND_API_KEY). Oturum veya kullanıcı yok.
 */
export default class ServiceAuthMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const header = ctx.request.header('authorization') ?? ''
    const received = Buffer.from(header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '')
    const expected = Buffer.from(env.get('SISTEM_A_INBOUND_API_KEY').release())

    if (received.length === 0 || received.length !== expected.length || !timingSafeEqual(received, expected)) {
      return ctx.response.unauthorized({ errors: [{ message: 'Invalid service credentials' }] })
    }
    return next()
  }
}
