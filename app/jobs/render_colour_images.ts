import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import ProductImageService from '#services/catalog/product_image_service'

interface Payload {
  modelFileId: string
  hexes: string[]
}

/** W3/W7: colour pictures too heavy to draw inside a web request. Idempotent per colour. */
export default class RenderColourImages extends Job<Payload> {
  static options: JobOptions = { queue: 'default', maxRetries: 1 }

  async execute() {
    await new ProductImageService().colourRenders(this.payload.modelFileId, this.payload.hexes, {
      inline: true,
    })
  }
}
