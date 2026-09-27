import type { HttpContext } from '@adonisjs/core/http'
import UseCaseService from '#services/marketing/use_case_service'
import env from '#start/env'
import LegalService from '#services/legal/legal_service'
import ReviewService from '#services/storefront/review_service'
import OrderService from '#services/orders/order_service'
import ContentService from '#services/content/content_service'
import CityPageService from '#services/marketing/city_page_service'
import MaterialPageService from '#services/marketing/material_page_service'
import StorefrontService from '#services/storefront/storefront_service'
import { shopOrderValidator, shopQueryValidator } from '#validators/storefront'
import CoverageService from '#services/matching/coverage_service'
import PricingRegionService from '#services/pricing/pricing_region_service'
import { visitorCountry } from '#services/pricing/visitor_country'

const siteUrl = () => env.get('APP_URL').replace(/\/$/, '')

/** Public storefront: no login needed to browse; ordering requires an account. */
export default class StorefrontController {
  async index({ request, inertia, auth }: HttpContext) {
    await auth.check()
    const query = await request.validateUsing(shopQueryValidator)
    const terms = await new PricingRegionService().termsFor(visitorCountry({ request }))
    const result = await new StorefrontService().list({
      terms,
      q: query.q,
      material: query.material,
      category: query.category,
      tag: query.tag,
      minPriceMinor: query.minPrice === undefined ? undefined : Math.round(query.minPrice * 100),
      maxPriceMinor: query.maxPrice === undefined ? undefined : Math.round(query.maxPrice * 100),
      sort: query.sort,
      page: query.page,
    })
    return inertia.render('shop/index', {
      ...result,
      categories: await new StorefrontService().categoriesInUse(),
      filters: {
        q: query.q ?? '',
        material: query.material ?? '',
        category: query.category ?? '',
        tag: query.tag ?? '',
        minPrice: query.minPrice ?? null,
        maxPrice: query.maxPrice ?? null,
        sort: query.sort ?? 'newest',
      },
      canonicalUrl: `${siteUrl()}/shop`,
    })
  }

  async show({ params, inertia, auth, response, request }: HttpContext) {
    await auth.check()
    const country = visitorCountry({ request })
    const terms = await new PricingRegionService().termsFor(country)
    const product = await new StorefrontService().find(params.id, terms)
    if (!product) return response.notFound()

    const canonicalPath = `/shop/${product.id}/${product.slug}`
    if (params.slug !== product.slug) return response.redirect(canonicalPath, false, 301)

    const canonicalUrl = `${siteUrl()}${canonicalPath}`
    // the listed range is the plain part; finishing is an extra the buyer adds
    const prices = product.options.filter((o) => o.finishing === null).map((o) => o.unitPriceMinor)
    const reviews = await new ReviewService().forListing(product.id)
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      'name': product.title,
      'description': product.description ?? product.title,
      'url': canonicalUrl,
      ...(product.images.length > 0
        ? { image: product.images.slice(0, 4).map((i) => `${siteUrl()}${i.url}`) }
        : {}),
      'offers': {
        '@type': 'AggregateOffer',
        'priceCurrency': product.currency,
        'lowPrice': (Math.min(...prices) / 100).toFixed(2),
        'highPrice': (Math.max(...prices) / 100).toFixed(2),
        'offerCount': prices.length,
        'availability': 'https://schema.org/InStock',
      },
      // only real ratings: nothing is emitted until a completed order was reviewed
      ...(reviews.count > 0
        ? {
            aggregateRating: {
              '@type': 'AggregateRating',
              'ratingValue': reviews.average,
              'reviewCount': reviews.count,
            },
          }
        : {}),
    }
    return inertia.render('shop/show', {
      product,
      reviews,
      canonicalUrl,
      // prices follow the visitor's likely country; say so when nobody prints there yet (K-K)
      delivery: { country, served: await new CoverageService().servesCountry(country) },
      jsonLd: JSON.stringify(jsonLd).replaceAll('<', '\\u003c'),
    })
  }

  async order({ request, auth, params, response }: HttpContext) {
    const { acceptTerms, ...data } = await request.validateUsing(shopOrderValidator)
    await new LegalService().requireAcceptance(auth.getUserOrFail().id, acceptTerms)
    const order = await new OrderService().createStorefrontDraft(
      auth.getUserOrFail(),
      params.id,
      data
    )
    return response.redirect().toRoute('order.show', { id: order.id })
  }

  async sitemap({ response }: HttpContext) {
    const entries = await new StorefrontService().sitemapEntries()
    const base = siteUrl()
    const content = new ContentService()
    const [posts, terms] = await Promise.all([content.list('blog'), content.list('glossary')])
    const materialPages = await new MaterialPageService().list()
    const indexableMaterials = materialPages.filter((m) => m.indexable)
    const allCities = await new CityPageService().list()
    const cityPages = allCities.filter((c) => c.indexable)
    const allUseCases = await new UseCaseService().list()
    const useCases = allUseCases.filter((u) => u.indexable)
    const urls = [
      `<url><loc>${base}/</loc></url>`,
      `<url><loc>${base}/shop</loc></url>`,
      `<url><loc>${base}/for-makers</loc></url>`,
      `<url><loc>${base}/help</loc></url>`,
      `<url><loc>${base}/for-sellers</loc></url>`,
      `<url><loc>${base}/tools/maker-income</loc></url>`,
      `<url><loc>${base}/tools/quick-quote</loc></url>`,
      `<url><loc>${base}/blog</loc></url>`,
      `<url><loc>${base}/glossary</loc></url>`,
      // only materials with enough real maker data are listed; the rest stay noindex
      ...(indexableMaterials.length > 0 ? [`<url><loc>${base}/materials</loc></url>`] : []),
      ...indexableMaterials.map((m) => `<url><loc>${base}/materials/${m.slug}</loc></url>`),
      // a city is listed only with enough active makers there (no page otherwise)
      ...(cityPages.length > 0 ? [`<url><loc>${base}/cities</loc></url>`] : []),
      ...cityPages.map((c) => `<url><loc>${base}/cities/${c.slug}</loc></url>`),
      ...(useCases.length > 0 ? [`<url><loc>${base}/use-cases</loc></url>`] : []),
      ...useCases.map((u) => `<url><loc>${base}/use-cases/${u.slug}</loc></url>`),
      ...posts.map(
        (p) => `<url><loc>${base}/blog/${p.slug}</loc><lastmod>${p.date}</lastmod></url>`
      ),
      ...terms.map(
        (t) => `<url><loc>${base}/glossary/${t.slug}</loc><lastmod>${t.date}</lastmod></url>`
      ),
      ...entries.map(
        (e) =>
          `<url><loc>${base}/shop/${e.id}/${e.slug}</loc><lastmod>${e.updatedAt}</lastmod></url>`
      ),
    ]
    return response
      .header('content-type', 'application/xml; charset=utf-8')
      .send(
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`
      )
  }

  async robots({ response }: HttpContext) {
    return response
      .header('content-type', 'text/plain; charset=utf-8')
      .send(
        [
          'User-agent: *',
          'Allow: /$',
          'Allow: /shop',
          'Allow: /blog',
          'Allow: /glossary',
          'Disallow: /admin',
          'Disallow: /maker',
          'Disallow: /seller',
          'Disallow: /orders',
          'Disallow: /files',
          'Disallow: /webhooks',
          `Sitemap: ${siteUrl()}/sitemap.xml`,
          '',
        ].join('\n')
      )
  }
}
