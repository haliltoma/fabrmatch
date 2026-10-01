import { DateTime } from 'luxon'
import CoverageService from '#services/matching/coverage_service'
import ShippingService from '#services/shipping/shipping_service'
import ReviewService from '#services/storefront/review_service'
import { productJsonLd, SOLD_COUNT_MIN } from '#services/storefront/product_schema'
import type { StorefrontDetail } from '#services/storefront/storefront_service'

/** JSON for an inline <script type="application/ld+json">: `<` escaped so it cannot close the tag. */
export const jsonForScript = (data: unknown) => JSON.stringify(data).replaceAll('<', '\\u003c')

/**
 * Everything the product page shows besides the product itself: real reviews, the sold count once
 * it is worth showing, whether anyone delivers to the visitor's country, and the structured data
 * for search engines built from the same numbers.
 */
export default class ProductPageService {
  async extras(product: StorefrontDetail, country: string, url: string, siteUrl: string) {
    const reviewService = new ReviewService()
    const [reviews, sold, served, shipping] = await Promise.all([
      reviewService.forListing(product.id),
      reviewService.soldCount(product.id),
      new CoverageService().servesCountry(country),
      new ShippingService().table(),
    ])
    const zone = shipping.zoneFor(country)
    const jsonLd = productJsonLd({
      product,
      reviews,
      url,
      siteUrl,
      delivery: { country, served },
      transitDays: { min: zone.transitDaysMin, max: zone.transitDaysMax },
      // prices follow the live reference list; a month is the promise a snapshot can keep
      priceValidUntil: DateTime.now().plus({ days: 30 }).toISODate()!,
    })
    return {
      reviews,
      delivery: { country, served },
      soldCount: sold >= SOLD_COUNT_MIN ? sold : null,
      jsonLd: jsonForScript(jsonLd),
    }
  }
}
