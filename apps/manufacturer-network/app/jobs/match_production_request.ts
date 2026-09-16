import { matchProductionRequest } from '#services/matching/matching_service'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'

interface MatchProductionRequestPayload {
  productionRequestId: number
}

export default class MatchProductionRequest extends Job<MatchProductionRequestPayload> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 3,
  }

  async execute() {
    await matchProductionRequest(this.payload.productionRequestId)
  }
}
