import type { HttpContext } from '@adonisjs/core/http'
import HealthService from '#services/admin/health_service'

export default class HealthController {
  /** Liveness/readiness for load balancers and uptime monitors; 503 only when a dependency is down. */
  async show({ response }: HttpContext) {
    const report = await new HealthService().check()
    return response.status(report.status === 'down' ? 503 : 200).json(report)
  }
}
