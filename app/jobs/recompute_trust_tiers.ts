import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import TrustTierService from '#services/manufacturing/trust_tier_service'

export default class RecomputeTrustTiers extends Job<Record<string, never>> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 1,
  }

  async execute() {
    await new TrustTierService().recomputeAll()
  }
}
