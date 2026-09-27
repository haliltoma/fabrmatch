import { test } from '@japa/runner'
import ShopifyAdapter from '#services/integrations/stores/shopify_adapter'
import WooCommerceAdapter from '#services/integrations/stores/woocommerce_adapter'
import { FakeShopify, FakeWoo } from '#tests/helpers/fake_shops'

test.group('Shop listings are read to the end', () => {
  test('Shopify follows the cursor across pages', async ({ assert }) => {
    const shop = new FakeShopify()
    shop.pageSize = 2
    for (let p = 1; p <= 3; p++) {
      shop.products.set(String(p), {
        title: `Product ${p}`,
        variants: [
          { id: `${p}1`, sku: `SKU-${p}-A`, price: '1.00' },
          { id: `${p}2`, sku: `SKU-${p}-B`, price: '1.00' },
        ],
      })
    }
    const variants = await new ShopifyAdapter(shop.http).listVariants(shop.connection())
    assert.lengthOf(variants, 6)
    const pages = shop.requests.filter((r) => r.query?.includes('productVariants('))
    assert.lengthOf(pages, 3)
  })

  test('WooCommerce reads page after page until a short one', async ({ assert }) => {
    const shop = new FakeWoo()
    for (let i = 0; i < 230; i++) {
      shop.products.set(1000 + i, { name: `P${i}`, variations: [] })
    }
    const variants = await new WooCommerceAdapter(shop.http).listVariants(shop.connection())
    assert.lengthOf(variants, 230)
    assert.lengthOf(
      shop.requests.filter((r) => r.path === '/products'),
      3
    )
  })
})
