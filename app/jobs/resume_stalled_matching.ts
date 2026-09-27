import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import MatchingService from '#services/matching/matching_service'

/** Picks up orders whose matching stalled after a failed start or follow-up round. */
export default class ResumeStalledMatching extends Job<Record<string, never>> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 1,
  }

  async execute() {
    await new MatchingService().resumeStalled()
  }
}
