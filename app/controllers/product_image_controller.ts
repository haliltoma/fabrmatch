import type { HttpContext } from '@adonisjs/core/http'
import drive from '@adonisjs/drive/services/main'
import ProductImage from '#models/product_image'

/**
 * Streams shop pictures from private storage. Public: approved pictures only, cached by browsers
 * and CDNs (a new render version gets a new id). Admin: any status, for reviewing maker photos.
 */
export default class ProductImageController {
  async show({ params, response }: HttpContext) {
    const image = await ProductImage.query()
      .where('id', params.id)
      .where('status', 'approved')
      .first()
    if (!image) return response.notFound()
    return this.stream(image, response, 'public, max-age=86400, stale-while-revalidate=604800')
  }

  async adminShow({ params, response }: HttpContext) {
    const image = await ProductImage.find(params.id)
    if (!image) return response.notFound()
    return this.stream(image, response, 'private, no-store')
  }

  private async stream(image: ProductImage, response: HttpContext['response'], cache: string) {
    const disk = drive.use('s3')
    if (!(await disk.exists(image.storageKey))) return response.notFound()
    response.header('Content-Type', image.contentType)
    response.header('Cache-Control', cache)
    response.header('X-Content-Type-Options', 'nosniff')
    return response.stream(await disk.getStream(image.storageKey))
  }
}
