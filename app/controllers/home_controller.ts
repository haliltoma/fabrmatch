import type { HttpContext } from '@adonisjs/core/http'
import ContentService from '#services/content/content_service'
import HomeStatsService from '#services/growth/home_stats_service'
import MaterialPageService from '#services/marketing/material_page_service'
import {
  DEFAULT_HOURLY_RATE_MINOR,
  DEFAULT_MANUFACTURER_PROFIT_BPS,
  GRAMS_PER_PRINT_HOUR,
} from '#services/pricing/price_engine'
import StorefrontService from '#services/storefront/storefront_service'

export default class HomeController {
  async show({ inertia }: HttpContext) {
    const [stats, shop, materials, posts] = await Promise.all([
      new HomeStatsService().load(),
      new StorefrontService().list({ sort: 'newest', perPage: 8 }),
      new MaterialPageService().list(),
      new ContentService().list('blog'),
    ])
    return inertia.render('home', {
      stats,
      guides: posts
        .slice(0, 3)
        .map((p) => ({ slug: p.slug, title: p.title, description: p.description, date: p.date })),
      incomeRules: {
        gramsPerHour: GRAMS_PER_PRINT_HOUR,
        hourlyRateMinor: DEFAULT_HOURLY_RATE_MINOR,
        profitBps: DEFAULT_MANUFACTURER_PROFIT_BPS,
      },
      products: shop.items.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        materials: p.materials,
        fromPriceMinor: p.fromPriceMinor,
        currency: p.currency,
      })),
      materials: materials.map((m) => ({
        slug: m.slug,
        code: m.code,
        name: m.name,
        technology: m.technology,
      })),
    })
  }
}
