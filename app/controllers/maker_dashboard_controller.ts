import type { HttpContext } from '@adonisjs/core/http'
import DashboardService from '#services/admin/dashboard_service'
import MakerWorkService from '#services/manufacturing/maker_work_service'

export default class MakerDashboardController {
  async index({ inertia, auth }: HttpContext) {
    const profile = await new MakerWorkService().profileFor(auth.getUserOrFail())
    return inertia.render('maker/dashboard', await new DashboardService().maker(profile))
  }
}
