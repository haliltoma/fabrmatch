import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import MetricsService from '#services/admin/metrics_service'

const validator = vine.create({ days: vine.number().withoutDecimals().min(1).max(365).optional() })

export default class AdminMetricsController {
  async index({ inertia, request }: HttpContext) {
    const { days } = await request.validateUsing(validator)
    return inertia.render('admin/metrics/index', {
      metrics: await new MetricsService().compute(days ?? 30),
    })
  }
}
