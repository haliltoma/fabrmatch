import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import ProductFeedService, { FeedError } from '#services/integrations/product_feed_service'

const linkValidator = vine.create({
  template: vine.string().trim().maxLength(500).nullable().optional(),
})

const BACK = '/seller/developers'

/** W5: the seller's product feed (public, by secret) and its settings in the panel. */
export default class ProductFeedController {
  /** `GET /feeds/:token/products.csv|json`: no session, no cookies; unknown tokens are a 404. */
  async show({ params, response }: HttpContext) {
    const feeds = new ProductFeedService()
    const found = await feeds.sellerFor(String(params.token))
    if (!found) return response.notFound('Feed not found')
    const rows = await feeds.rows(found.seller, found.profile)
    response.header('Cache-Control', 'private, max-age=900')
    response.header('X-Robots-Tag', 'noindex')
    if (params.file === 'products.json') return response.json({ data: rows })
    response.header('Content-Type', 'text/csv; charset=utf-8')
    response.header('Content-Disposition', 'inline; filename="products.csv"')
    return response.send(feeds.toCsv(rows))
  }

  async rotate({ auth, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    await user.load('sellerProfile')
    await new ProductFeedService().rotate(user.sellerProfile)
    session.flash('success', 'New feed address made. The old one no longer works.')
    return response.redirect().toPath(BACK)
  }

  async turnOff({ auth, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    await user.load('sellerProfile')
    await new ProductFeedService().turnOff(user.sellerProfile)
    session.flash('success', 'Product feed turned off.')
    return response.redirect().toPath(BACK)
  }

  async link({ auth, request, response, session }: HttpContext) {
    const { template } = await request.validateUsing(linkValidator)
    const user = auth.getUserOrFail()
    await user.load('sellerProfile')
    try {
      await new ProductFeedService().setLinkTemplate(user.sellerProfile, template ?? null)
    } catch (error) {
      if (!(error instanceof FeedError)) throw error
      session.flash('error', error.message)
      return response.redirect().toPath(BACK)
    }
    session.flash('success', 'Product links saved.')
    return response.redirect().toPath(BACK)
  }
}
