import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import PrintProfile from '#models/print_profile'
import SliceEstimateService from '#services/slicing/slice_estimate_service'

interface Payload {
  modelFileId: string
}

/** After analysis: slice the model for every active FDM profile so quotes can use real numbers. */
export default class SliceModelFile extends Job<Payload> {
  static options: JobOptions = { queue: 'default', maxRetries: 1 }

  async execute() {
    const service = new SliceEstimateService()
    if (!service.enabled) return
    const profiles = await PrintProfile.query().where('isActive', true).where('technology', 'FDM')
    for (const profile of profiles) {
      await service.ensure(this.payload.modelFileId, profile.code)
    }
  }
}
