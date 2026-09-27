import type { HttpContext } from '@adonisjs/core/http'
import LaunchReadinessService from '#services/admin/launch_readiness_service'

/** /admin/launch: what still stands between us and real payments (R7-T8). */
export default class AdminLaunchController {
  async index({ inertia }: HttpContext) {
    const checks = await new LaunchReadinessService().evaluate()
    return inertia.render('admin/launch/index', {
      checks,
      ready: checks.every((c) => c.ok || !c.blocking),
    })
  }
}
