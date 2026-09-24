import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import RfqService from '#services/rfq/rfq_service'

/** Sweep: closes bidding at the deadline and expires requests nobody was chosen for. Idempotent. */
export default class CloseRfqs extends Job<Record<string, never>> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 3,
  }

  async execute() {
    await new RfqService().closeDue()
  }
}
