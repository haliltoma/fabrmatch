import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import RoleService from '#services/identity/role_service'

export default class OnboardingMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.user
    if (!user) return next()

    const roleService = new RoleService()
    const roles = await roleService.getUserRoles(user)

    if (roles.length === 0) {
      return ctx.response.redirect().toPath('/onboarding')
    }

    return next()
  }
}
