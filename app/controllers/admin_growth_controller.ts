import type { HttpContext } from '@adonisjs/core/http'
import GrowthService from '#services/growth/growth_service'

export default class AdminGrowthController {
  async index({ inertia }: HttpContext) {
    const growth = new GrowthService()
    const [funnel, leads, activation] = await Promise.all([
      growth.funnel(30),
      growth.leadTotals(),
      growth.makerActivation(),
    ])
    return inertia.render('admin/growth/index', { funnel, leads, activation })
  }
}
