import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { Role } from '#models/user_role'
import SellerPolicy from '#policies/seller_policy'
import ManufacturerPolicy from '#policies/manufacturer_policy'
import AdminPolicy from '#policies/admin_policy'

const POLICIES = {
  seller: SellerPolicy,
  manufacturer: ManufacturerPolicy,
  admin: AdminPolicy,
} as const

export default class RoleMiddleware {
  async handle(ctx: HttpContext, next: NextFn, options: { role: Role }) {
    await ctx.bouncer.with(POLICIES[options.role]).authorize('access')
    return next()
  }
}
