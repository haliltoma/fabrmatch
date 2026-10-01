import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import LegalService from '#services/legal/legal_service'
import OrderService from '#services/orders/order_service'
import StorefrontService from '#services/storefront/storefront_service'
import ProductPageService from '#services/storefront/product_page_service'
import { shopOrderValidator, shopQueryValidator } from '#validators/storefront'
import PricingRegionService from '#services/pricing/pricing_region_service'
import { visitorCountry } from '#services/pricing/visitor_country'
import { minorToInput } from '#services/pricing/money_input'

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
      minPriceMinor: query.minPrice,
      maxPriceMinor: query.maxPrice,
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
        // back in the form the visitor typed (major units), so the next filter change sends the same
        minPrice: query.minPrice === undefined ? null : minorToInput(query.minPrice),
        maxPrice: query.maxPrice === undefined ? null : minorToInput(query.maxPrice),
        sort: query.sort ?? 'newest',
      },
      canonicalUrl: `${siteUrl()}/shop`,
    })
  }

  async show({ params, inertia, auth, response, request }: HttpContext) {
    await auth.check()
    // the buyer can price for another delivery country than we guessed (?country=DE)
    const asked = String(request.input('country', '')).toUpperCase()
    const country = /^[A-Z]{2}$/.test(asked) ? asked : visitorCountry({ request })
    const terms = await new PricingRegionService().termsFor(country)
    const product = await new StorefrontService().find(params.id, terms)
    if (!product) return response.notFound()

    const canonicalPath = `/shop/${product.id}/${product.slug}`
    if (params.slug !== product.slug) return response.redirect(canonicalPath, false, 301)

    const canonicalUrl = `${siteUrl()}${canonicalPath}`
    const extras = await new ProductPageService().extras(product, country, canonicalUrl, siteUrl())
    // prices follow the visitor's likely country; the page says so when nobody prints there (K-K)
    return inertia.render('shop/show', { product, canonicalUrl, ...extras })
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
}
