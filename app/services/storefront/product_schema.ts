import type { StorefrontDetail } from '#services/storefront/storefront_service'
import type { ProductReviews } from '#services/storefront/review_service'

/** Below this many finished orders the page does not boast a count (a "1 sold" hurts more than it helps). */
export const SOLD_COUNT_MIN = 3

export interface ProductSchemaInput {
  product: StorefrontDetail
  reviews: ProductReviews
  url: string
  siteUrl: string
  /** Country the shown prices deliver to, and whether any maker serves it yet. */
  delivery: { country: string; served: boolean }
  /** Carrier transit days for that country (shipping table zone). */
  transitDays: { min: number; max: number }
  /** Prices are recomputed from live reference prices; say how long this snapshot holds. */
  priceValidUntil: string
}

/**
 * Product JSON-LD for rich results (price, availability, delivery, stars). It only states what the
 * page shows: the listed prices already include delivery, so the shipping rate is 0; the rating is
 * the real average of finished orders and is left out until one exists. No review author names
 * (buyers stay anonymous, rule 1) and no return policy until the made-to-order withdrawal wording
 * is confirmed by counsel (D5).
 */
export function productJsonLd(input: ProductSchemaInput) {
  const { product, reviews, url, siteUrl, delivery, transitDays } = input
  const plain = product.options.filter((o) => o.finishing === null).map((o) => o.unitPriceMinor)
  const money = (minor: number) => (minor / 100).toFixed(2)
  const availability = delivery.served
    ? 'https://schema.org/InStock'
    : 'https://schema.org/OutOfStock'
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    'name': product.title,
    'description': product.description ?? product.title,
    'url': url,
    'sku': `FM-${product.id}`,
    ...(product.category ? { category: product.category.name } : {}),
    ...(product.images.length > 0
      ? { image: product.images.slice(0, 4).map((i) => `${siteUrl}${i.url}`) }
      : {}),
    'offers': {
      '@type': 'AggregateOffer',
      'url': url,
      'priceCurrency': product.currency,
      'lowPrice': money(Math.min(...plain)),
      'highPrice': money(Math.max(...plain)),
      'offerCount': plain.length,
      'availability': availability,
      'itemCondition': 'https://schema.org/NewCondition',
      'priceValidUntil': input.priceValidUntil,
      'shippingDetails': {
        '@type': 'OfferShippingDetails',
        // the listed price is the delivered price
        'shippingRate': { '@type': 'MonetaryAmount', 'value': '0', 'currency': product.currency },
        'shippingDestination': {
          '@type': 'DefinedRegion',
          'addressCountry': delivery.country,
        },
        'deliveryTime': {
          '@type': 'ShippingDeliveryTime',
          'handlingTime': {
            '@type': 'QuantitativeValue',
            'minValue': 1,
            'maxValue': Math.max(1, product.productionDays),
            'unitCode': 'DAY',
          },
          'transitTime': {
            '@type': 'QuantitativeValue',
            'minValue': transitDays.min,
            'maxValue': transitDays.max,
            'unitCode': 'DAY',
          },
        },
      },
    },
    ...(reviews.count > 0 && reviews.average !== null
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            'ratingValue': reviews.average,
            'reviewCount': reviews.count,
            'bestRating': 5,
            'worstRating': 1,
          },
        }
      : {}),
  }
}
