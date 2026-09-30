import type { HttpContext } from '@adonisjs/core/http'
import SeoService from '#services/marketing/seo_service'

/** Files for crawlers: sitemap.xml, robots.txt and llms.txt (content lives in SeoService). */
export default class SeoController {
  async sitemap({ response }: HttpContext) {
    return response
      .header('content-type', 'application/xml; charset=utf-8')
      .send(await new SeoService().sitemapXml())
  }

  async robots({ response }: HttpContext) {
    return response
      .header('content-type', 'text/plain; charset=utf-8')
      .send(new SeoService().robotsTxt())
  }

  async llms({ response }: HttpContext) {
    return response
      .header('content-type', 'text/plain; charset=utf-8')
      .header('cache-control', 'public, max-age=3600')
      .send(await new SeoService().llmsTxt())
  }
}
