import type { HttpContext } from '@adonisjs/core/http'
import {
  roleSelectionValidator,
  sellerProfileValidator,
  manufacturerProfileValidator,
} from '#validators/onboarding'
import OnboardingService from '#services/identity/onboarding_service'
import RoleService from '#services/identity/role_service'
import { INTENDED_URL, safeIntendedUrl } from '#services/identity/landing_service'

export default class OnboardingController {
  async show({ inertia, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    const roleService = new RoleService()
    const roles = await roleService.getUserRoles(user)

    const onboardingRole = roles.find((r) => r === 'seller' || r === 'manufacturer')
    if (onboardingRole) {
      return inertia.render('onboarding/profile', {
        selectedRole: onboardingRole as 'seller' | 'manufacturer',
      })
    }

    return inertia.render('onboarding/role_select', {})
  }

  async storeRole(ctx: HttpContext) {
    const { request, response, auth, session } = ctx
    const { role } = await request.validateUsing(roleSelectionValidator)
    const user = auth.getUserOrFail()

    const roleService = new RoleService()
    if (role === 'buyer') {
      // buyers order under the seller role and never need a shop profile: straight to a price
      await roleService.assignRole(user, 'seller')
      session.flash('success', 'Welcome! Upload a model to see its price in seconds.')
      const intended = safeIntendedUrl(session.pull(INTENDED_URL))
      return response.redirect().toPath(intended ?? '/files')
    }
    await roleService.assignRole(user, role)

    session.flash('success', 'Role selected. Now complete your profile.')
    return response.redirect().toPath('/onboarding/profile')
  }

  async showProfile({ inertia, auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const roleService = new RoleService()
    const roles = await roleService.getUserRoles(user)

    if (roles.length === 0) {
      return response.redirect().toPath('/onboarding')
    }

    const onboardingRole = await new OnboardingService().roleMissingProfile(user, roles)
    if (!onboardingRole) {
      const home = roles.includes('seller')
        ? '/seller'
        : roles.includes('manufacturer')
          ? '/maker'
          : '/'
      return response.redirect().toPath(home)
    }
    return inertia.render('onboarding/profile', { selectedRole: onboardingRole })
  }

  async storeProfile({ request, response, auth, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const roleService = new RoleService()
    const roles = await roleService.getUserRoles(user)
    const onboarding = new OnboardingService()
    const missing = await onboarding.roleMissingProfile(user, roles)

    if (missing === 'seller') {
      const data = await request.validateUsing(sellerProfileValidator)
      await onboarding.createSellerProfile(user, { ...data, isCorporate: !!data.isCorporate })
      session.flash('success', 'Seller profile created!')
      return response.redirect().toPath('/seller')
    }

    if (missing === 'manufacturer') {
      const data = await request.validateUsing(manufacturerProfileValidator)
      await onboarding.createManufacturerProfile(user, { ...data, isCorporate: !!data.isCorporate })
      session.flash('success', 'Manufacturer profile created!')
      return response.redirect().toPath('/maker')
    }

    return response.redirect().toPath('/onboarding')
  }
}
