import { expireStaleOffers, retryUnmatchedRequests } from '#services/matching/sweep'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'

interface SweepMatchingPayload {}

/** Zamanlanmış (start/scheduler.ts): süresi dolan teklifleri serbest bırakır, eşleşmemiş talepleri yeniden dener. */
export default class SweepMatching extends Job<SweepMatchingPayload> {
  static options: JobOptions = { queue: 'default', maxRetries: 0 }

  async execute() {
    await expireStaleOffers()
    await retryUnmatchedRequests()
  }
}
