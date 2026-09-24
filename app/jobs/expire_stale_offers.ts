import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import MatchingService from '#services/matching/matching_service'

export default class ExpireStaleOffers extends Job<Record<string, never>> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 1,
  }

  async execute() {
    await new MatchingService().expireStaleOffers()
  }
}
