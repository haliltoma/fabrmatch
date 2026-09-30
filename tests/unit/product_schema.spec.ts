import { test } from '@japa/runner'
import { productJsonLd, type ProductSchemaInput } from '#services/storefront/product_schema'
import type { StorefrontDetail } from '#services/storefront/storefront_service'

const product = {
  id: 7,
  slug: 'vase',
  title: 'Vase',
  description: 'A tall vase',
  materials: ['PLA'],
  fromPriceMinor: 10000,
  currency: 'TRY',
  bboxMm: null,
  category: { slug: 'decor', name: 'Decor' },
  tags: [],
  image: null,
  images: [{ url: '/images/1' }],
  scales: [100],
  options: [
    { material: 'PLA', scalePercent: 100, finishing: null, unitPriceMinor: 12000 },
    { material: 'PETG', scalePercent: 100, finishing: null, unitPriceMinor: 15050 },
    // a finishing is an extra: never the listed range
    { material: 'PLA', scalePercent: 100, finishing: 'paint', unitPriceMinor: 99900 },
  ],
  finishings: [],
  paintColours: [],
  productionDays: 4,
  updatedAt: '2026-09-30',
} as unknown as StorefrontDetail

const input = (over: Partial<ProductSchemaInput> = {}): ProductSchemaInput => ({
  product,
  reviews: { count: 0, average: null, recent: [] },
  url: 'https://fabrmatch.com/shop/7/vase',
  siteUrl: 'https://fabrmatch.com',
  delivery: { country: 'TR', served: true },
  transitDays: { min: 1, max: 3 },
  priceValidUntil: '2026-10-30',
  ...over,
})

test.group('product JSON-LD', () => {
  test('lists the plain price range, delivered (shipping 0) with handling and transit days', ({
    assert,
  }) => {
    const ld = productJsonLd(input()) as any
    assert.equal(ld['@type'], 'Product')
    assert.equal(ld.sku, 'FM-7')
    assert.equal(ld.offers.lowPrice, '120.00')
    assert.equal(ld.offers.highPrice, '150.50')
    assert.equal(ld.offers.offerCount, 2)
    assert.equal(ld.offers.shippingDetails.shippingRate.value, '0')
    assert.equal(ld.offers.shippingDetails.deliveryTime.handlingTime.maxValue, 4)
    assert.equal(ld.offers.shippingDetails.deliveryTime.transitTime.maxValue, 3)
    assert.deepEqual(ld.image, ['https://fabrmatch.com/images/1'])
  })

  test('no stars until a finished order was reviewed, then the real average', ({ assert }) => {
    assert.notProperty(productJsonLd(input()), 'aggregateRating')
    const ld = productJsonLd(input({ reviews: { count: 3, average: 4.7, recent: [] } })) as any
    assert.equal(ld.aggregateRating.ratingValue, 4.7)
    assert.equal(ld.aggregateRating.reviewCount, 3)
  })

  test('says out of stock where no maker delivers yet', ({ assert }) => {
    const ld = productJsonLd(input({ delivery: { country: 'DE', served: false } })) as any
    assert.equal(ld.offers.availability, 'https://schema.org/OutOfStock')
    assert.equal(ld.offers.shippingDetails.shippingDestination.addressCountry, 'DE')
  })

  test('never names a buyer or maker', ({ assert }) => {
    const text = JSON.stringify(
      productJsonLd(input({ reviews: { count: 1, average: 5, recent: [] } }))
    )
    assert.notInclude(text, '"author"')
    assert.notInclude(text, 'manufacturer')
  })
})
