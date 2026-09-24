import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import LifecycleService from '#services/notifications/lifecycle_service'

export default class RunLifecycle extends Job<Record<string, never>> {
  static options: JobOptions = { queue: 'default', maxRetries: 1 }

  async execute() {
    await new LifecycleService().sweep()
  }
}
