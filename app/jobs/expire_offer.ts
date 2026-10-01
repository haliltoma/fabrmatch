import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import MatchingService from '#services/matching/matching_service'

interface ExpireOfferPayload {
  offerId: string
}

export default class ExpireOffer extends Job<ExpireOfferPayload> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 3,
  }

  async execute() {
    await new MatchingService().expireOffer(this.payload.offerId)
  }
}
