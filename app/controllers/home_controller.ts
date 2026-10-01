import type { HttpContext } from '@adonisjs/core/http'
import CatalogProduct from '#models/catalog_product'
import MarginPreviewService from '#services/catalog/margin_preview_service'
import ContentService from '#services/content/content_service'
import ExperimentService from '#services/growth/experiment_service'
import GrowthService from '#services/growth/growth_service'
import type { Attribution } from '#services/growth/attribution'
import HomeStatsService from '#services/growth/home_stats_service'
import MaterialPageService from '#services/marketing/material_page_service'
import { incomeRules } from '#services/pricing/maker_income'
import { FAQ, faqParams } from '#services/support/faq'
import PricingRegionService, { type BrowseTerms } from '#services/pricing/pricing_region_service'
import { visitorCountry } from '#services/pricing/visitor_country'
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
    const terms = await new PricingRegionService().termsFor(visitorCountry({ request }))
    const [stats, shop, materials, posts, marginSamples] = await Promise.all([
      new HomeStatsService().load(),
      new StorefrontService().list({ sort: 'newest', perPage: 8, terms }),
      new MaterialPageService().list(),
      new ContentService().list('blog'),
      this.marginSamples(terms),
    ])
    return inertia.render('home', {
      stats,
      ctaVariant,
      marginSamples,
      faq: FAQ,
      faqParams: faqParams(),
      guides: posts
        .slice(0, 3)
        .map((p) => ({ slug: p.slug, title: p.title, description: p.description, date: p.date })),
      incomeRules: incomeRules(),
      products: shop.items.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        materials: p.materials,
        fromPriceMinor: p.fromPriceMinor,
        currency: p.currency,
        image: p.image,
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
  private async marginSamples(terms?: BrowseTerms) {
    const products = await CatalogProduct.query()
      .where('isActive', true)
      .orderBy('id', 'asc')
      .limit(12)
    const preview = new MarginPreviewService()
    const samples: Array<{ id: string; title: string; material: string; costMinor: number }> = []
    for (const p of products) {
      if (samples.length === 4) break
      const [first] = await preview.preview(p.id, 0, terms)
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
