import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import ProductImageService from '#services/catalog/product_image_service'

interface Payload {
  modelFileId: number
}

/** After analysis: turntable renders for the shop. Idempotent per render version. */
export default class RenderModelFile extends Job<Payload> {
  static options: JobOptions = { queue: 'default', maxRetries: 1 }

  async execute() {
    await new ProductImageService().renderModel(this.payload.modelFileId)
  }
}
