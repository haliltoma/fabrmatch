import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import logger from '@adonisjs/core/services/logger'
import ModelFileService from '#services/files/model_file_service'

/** Re-queues model scans that stalled and fails the ones that never finished (see recoverStalled). */
export default class RecoverStalledAnalyses extends Job<Record<string, never>> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 1,
  }

  async execute() {
    const result = await new ModelFileService().recoverStalled()
    if (result.requeued || result.failed) logger.info({ msg: 'Stalled model scans', ...result })
  }
}
