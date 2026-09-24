import type { HttpContext } from '@adonisjs/core/http'
import ExperimentService from '#services/growth/experiment_service'

export default class AdminExperimentController {
  async index({ inertia }: HttpContext) {
    return inertia.render('admin/experiments/index', {
      experiments: await new ExperimentService().results(),
    })
  }
}
