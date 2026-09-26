import type { HttpContext } from '@adonisjs/core/http'
import CatalogProduct from '#models/catalog_product'
import MarginPreviewService from '#services/catalog/margin_preview_service'
import ContentService from '#services/content/content_service'
import ExperimentService from '#services/growth/experiment_service'
import GrowthService from '#services/growth/growth_service'
import type { Attribution } from '#services/growth/attribution'
import HomeStatsService from '#services/growth/home_stats_service'
import MaterialPageService from '#services/marketing/material_page_service'
import {
  DEFAULT_HOURLY_RATE_MINOR,
  DEFAULT_MANUFACTURER_PROFIT_BPS,
  GRAMS_PER_PRINT_HOUR,
} from '#services/pricing/price_engine'
import { FAQ } from '#controllers/support_controller'
import StorefrontService from '#services/storefront/storefront_service'

export default class HomeController {
  async show({ inertia, request, session }: HttpContext) {
    await new GrowthService().track(
      'landing_view',
      (session.get('attribution') as Attribution | undefined) ?? null,
      '/'
    )
    const ctaVariant = await new ExperimentService().expose(
      'home_cta',
      session.sessionId,
      request.header('user-agent') ?? ''
    )
    const [stats, shop, materials, posts, marginSamples] = await Promise.all([
      new HomeStatsService().load(),
      new StorefrontService().list({ sort: 'newest', perPage: 8 }),
      new MaterialPageService().list(),
      new ContentService().list('blog'),
      this.marginSamples(),
    ])
    return inertia.render('home', {
      stats,
      ctaVariant,
      marginSamples,
      faq: FAQ.slice(0, 5),
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

  /** Up to four active catalog designs with their real cost (seller margin 0) in their first material. */
  private async marginSamples() {
    const products = await CatalogProduct.query()
      .where('isActive', true)
      .orderBy('id', 'asc')
      .limit(12)
    const preview = new MarginPreviewService()
    const samples: Array<{ id: number; title: string; material: string; costMinor: number }> = []
    for (const p of products) {
      if (samples.length === 4) break
      const [first] = await preview.preview(p.id, 0)
      if (first)
        samples.push({
          id: p.id,
          title: p.title,
          material: first.material,
          costMinor: first.costMinor,
        })
    }
    return samples
  }
}
