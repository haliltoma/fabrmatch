import type { HttpContext } from '@adonisjs/core/http'
import DashboardService from '#services/admin/dashboard_service'

export default class SellerDashboardController {
  async index({ inertia, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    await user.load('sellerProfile')
    return inertia.render(
      'seller/dashboard',
      await new DashboardService().seller(user.id, user.sellerProfile)
    )
  }
}
