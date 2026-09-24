import type { HttpContext } from '@adonisjs/core/http'
import DashboardService from '#services/admin/dashboard_service'

export default class AdminDashboardController {
  async index({ inertia }: HttpContext) {
    return inertia.render('admin/dashboard', await new DashboardService().admin())
  }
}
