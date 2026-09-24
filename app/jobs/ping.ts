import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import logger from '@adonisjs/core/services/logger'

interface PingPayload {
  message: string
}

export default class Ping extends Job<PingPayload> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 3,
  }

  async execute() {
    logger.info({ msg: 'PingJob executed', payload: this.payload })
  }

  async failed(error: Error) {
    logger.error({ msg: 'PingJob failed', error: error.message })
  }
}
