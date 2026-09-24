import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import FxService from '#services/pricing/fx_service'

/** Pulls the day's exchange rates. Idempotent: one row per currency and day, overwritten on a rerun. */
export default class RefreshFxRates extends Job<Record<string, never>> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 3,
  }

  async execute() {
    await new FxService().refresh()
  }
}
