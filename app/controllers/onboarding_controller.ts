import type { HttpContext } from '@adonisjs/core/http'
import {
  roleSelectionValidator,
  sellerProfileValidator,
  manufacturerProfileValidator,
} from '#validators/onboarding'
import OnboardingService from '#services/identity/onboarding_service'
import RoleService from '#services/identity/role_service'

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

  async storeRole({ request, response, auth, session }: HttpContext) {
    const { role } = await request.validateUsing(roleSelectionValidator)
    const user = auth.getUserOrFail()

    const roleService = new RoleService()
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

    const onboardingRole = roles.find((r) => r === 'seller' || r === 'manufacturer')
    return inertia.render('onboarding/profile', {
      selectedRole: (onboardingRole || roles[0]) as 'seller' | 'manufacturer',
    })
  }

  async storeProfile({ request, response, auth, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const roleService = new RoleService()
    const roles = await roleService.getUserRoles(user)
    const onboarding = new OnboardingService()

    if (roles.includes('seller')) {
      const data = await request.validateUsing(sellerProfileValidator)
      await onboarding.createSellerProfile(user, data)
      session.flash('success', 'Seller profile created!')
      return response.redirect().toPath('/seller')
    }

    if (roles.includes('manufacturer')) {
      const data = await request.validateUsing(manufacturerProfileValidator)
      await onboarding.createManufacturerProfile(user, data)
      session.flash('success', 'Manufacturer profile created!')
      return response.redirect().toPath('/maker')
    }

    return response.redirect().toPath('/onboarding')
  }
}
