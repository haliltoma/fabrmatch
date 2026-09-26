import type { HttpContext } from '@adonisjs/core/http'
import DashboardService from '#services/admin/dashboard_service'
import SellerSetupService from '#services/catalog/seller_setup_service'

export default class SellerDashboardController {
  async index({ inertia, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    await user.load('sellerProfile')
    const [overview, setup] = await Promise.all([
      new DashboardService().seller(user.id, user.sellerProfile),
      new SellerSetupService().forProfile(user.sellerProfile),
    ])
    return inertia.render('seller/dashboard', { ...overview, setup })
  }
}
