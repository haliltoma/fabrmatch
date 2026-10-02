import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import SellerProfile from '#models/seller_profile'
import RoleService from '#services/identity/role_service'
import ProductFeedService, { FEED_COLUMNS } from '#services/integrations/product_feed_service'
import { fabrmatchSku } from '#services/integrations/stores/store_adapter'
import { createStorefrontProduct, ensureReferenceCatalog } from '#tests/helpers/order_fixtures'

const INERTIA = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }

async function sellerWithFeed() {
  const shop = await createStorefrontProduct({ title: '=Vase, "big"', materials: ['PLA', 'PETG'] })
  await new RoleService().assignRole(shop.sellerUser, 'seller')
  const profile = await SellerProfile.findOrFail(shop.seller.id)
  const token = await new ProductFeedService().rotate(profile)
  return { ...shop, profile, token }
}

test.group('W5: product feed for any site or marketplace', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('CSV: one row per material, Google Merchant columns, safe cells', async ({
    client,
    assert,
  }) => {
    const { product, token } = await sellerWithFeed()
    const response = await client.get(`/feeds/${token}/products.csv`)
    response.assertStatus(200)
    assert.match(response.header('content-type') ?? '', /text\/csv/)
    const [header, ...lines] = response.text().split('\r\n')
    assert.equal(header, FEED_COLUMNS.join(','))
    assert.lengthOf(lines, 2)
    assert.include(lines[0], fabrmatchSku(product.id, 'PLA'))
    // a title that looks like a formula is never run by a spreadsheet; quotes are escaped
    assert.include(lines[0], `"'=Vase, ""big"""`)
    assert.match(lines[0], /\d+\.\d{2} TRY/)
  })

  test('JSON, the link template, a rotated token and a draft product', async ({
    client,
    assert,
  }) => {
    const { product, profile, token } = await sellerWithFeed()
    const feeds = new ProductFeedService()
    await feeds.setLinkTemplate(profile, 'https://myshop.example.com/p/{id}')
    const json = await client.get(`/feeds/${token}/products.json`)
    json.assertStatus(200)
    assert.equal(json.body().data[0].link, `https://myshop.example.com/p/${product.id}`)
    await assert.rejects(
      () => feeds.setLinkTemplate(profile, 'https://myshop.example.com/p'),
      /\{id\}/
    )
    await assert.rejects(
      () => feeds.setLinkTemplate(profile, 'http://127.0.0.1/{id}'),
      /public https/
    )

    product.status = 'draft'
    await product.save()
    const empty = await client.get(`/feeds/${token}/products.json`)
    assert.lengthOf(empty.body().data, 0)

    const fresh = await feeds.rotate(profile)
    const old = await client.get(`/feeds/${token}/products.json`)
    old.assertStatus(404)
    const now = await client.get(`/feeds/${fresh}/products.json`)
    now.assertStatus(200)
  })

  test('the panel turns the feed on and shows its address', async ({ client, assert }) => {
    const shop = await createStorefrontProduct()
    await new RoleService().assignRole(shop.sellerUser, 'seller')
    const on = await client
      .post('/seller/developers/feed')
      .loginAs(shop.sellerUser)
      .withCsrfToken()
      .headers(INERTIA)
      .redirects(0)
    on.assertStatus(302)
    const page = await client.get('/seller/developers').loginAs(shop.sellerUser).headers(INERTIA)
    assert.match(page.body().props.feed.csvUrl, /\/feeds\/fmf_[0-9a-f]{48}\/products\.csv$/)
    const profile = await SellerProfile.findOrFail(shop.seller.id)
    assert.notInclude(profile.feedTokenEnc!, 'fmf_')
  })
})
