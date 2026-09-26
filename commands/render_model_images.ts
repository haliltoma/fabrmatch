import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/** Backfill: turntable renders for analysed STL files that do not have this render version yet. */
export default class RenderModelImages extends BaseCommand {
  static commandName = 'images:render'
  static description = 'Render shop images for analysed STL models that have none yet'
  static options: CommandOptions = { startApp: true }

  @flags.number({ description: 'Only this model file id' })
  declare file?: number

  async run() {
    const { default: ModelFile } = await import('#models/model_file')
    const { default: ProductImageService } = await import('#services/catalog/product_image_service')

    const query = ModelFile.query()
      .where('format', 'STL')
      .where('analysisStatus', 'done')
      .whereNull('blockedAt')
      .orderBy('id', 'asc')
    if (this.file) query.where('id', this.file)
    const files = await query.select('id')

    const service = new ProductImageService()
    let rendered = 0
    for (const { id } of files) {
      try {
        const frames = await service.renderModel(id)
        if (frames > 0) {
          rendered++
          this.logger.info(`model ${id}: ${frames} images`)
        }
      } catch (error) {
        this.logger.error(`model ${id}: ${(error as Error).message}`)
      }
    }
    this.logger.success(`Rendered ${rendered} of ${files.length} models`)
  }
}
