import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Order from '#models/order'
import RoleService from '#services/identity/role_service'
import { TR_ADDRESS, createStorefrontProduct, createUser } from '#tests/helpers/order_fixtures'

const INERTIA = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }

test.group('storefront (public)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('/shop is public and lists visible products', async ({ client, assert }) => {
    const { product } = await createStorefrontProduct({ title: 'Cable Clip' })
    await createStorefrontProduct({ title: 'Hidden', productStatus: 'draft' })

    const response = await client.get('/shop').headers(INERTIA)
    response.assertStatus(200)
    const props = response.body().props
    assert.deepEqual(
      props.items.map((i: { id: string }) => i.id),
      [product.id]
    )
    assert.equal(props.total, 1)
  })

  test('search and filters travel through the query string', async ({ client, assert }) => {
    await createStorefrontProduct({ title: 'Dragon', materials: ['PLA'] })
    await createStorefrontProduct({ title: 'Vase', materials: ['PETG'] })

    const q = await client.get('/shop?q=dragon').headers(INERTIA)
    assert.equal(q.body().props.total, 1)
    const m = await client.get('/shop?material=petg').headers(INERTIA)
    assert.equal(m.body().props.items[0].title, 'Vase')
    const bad = await client.get('/shop?page=-3').headers(INERTIA)
    assert.notEqual(bad.status(), 500)
  })

  test('product page: canonical slug redirect (301), canonical URL and JSON-LD', async ({
    client,
    assert,
  }) => {
    const { product } = await createStorefrontProduct({ title: 'Desk Organizer' })

    const wrong = await client.get(`/shop/${product.id}/old-name`).redirects(0)
    wrong.assertStatus(301)
    assert.equal(wrong.header('location'), `/shop/${product.id}/desk-organizer`)

    const ok = await client.get(`/shop/${product.id}/desk-organizer`).headers(INERTIA)
    ok.assertStatus(200)
    const { canonicalUrl, jsonLd, product: shown } = ok.body().props
    assert.match(canonicalUrl, new RegExp(`/shop/${product.id}/desk-organizer$`))
    const data = JSON.parse(jsonLd)
    assert.equal(data['@type'], 'Product')
    assert.equal(data.name, 'Desk Organizer')
    assert.equal(data.offers.priceCurrency, 'TRY')
    assert.equal(
      data.offers.offerCount,
      shown.options.filter((o: { finishing: string | null }) => o.finishing === null).length
    )
    assert.match(data.offers.lowPrice, /^\d+\.\d{2}$/)
  })

  test('JSON-LD cannot break out of its script tag', async ({ client, assert }) => {
    const { product } = await createStorefrontProduct({
      title: 'Evil',
      description: '</script><script>alert(1)</script>',
    })
    const response = await client.get(`/shop/${product.id}/evil`).headers(INERTIA)
    assert.notInclude(response.body().props.jsonLd, '</script>')
    assert.equal(
      JSON.parse(response.body().props.jsonLd).description,
      '</script><script>alert(1)</script>'
    )
  })

  test('hidden or unknown products are 404', async ({ client }) => {
    const { product } = await createStorefrontProduct({ productStatus: 'draft' })
    const draft = await client.get(`/shop/${product.id}/x`)
    draft.assertStatus(404)
    const unknown = await client.get('/shop/999999/x')
    unknown.assertStatus(404)
  })

  test('sitemap.xml lists home, shop and every visible product only', async ({
    client,
    assert,
  }) => {
    const { product } = await createStorefrontProduct({ title: 'Desk Organizer' })
    const { product: hidden } = await createStorefrontProduct({
      title: 'Nope',
      productStatus: 'draft',
    })

    const response = await client.get('/sitemap.xml')
    response.assertStatus(200)
    assert.include(response.header('content-type'), 'application/xml')
    const xml = response.text()
    assert.include(xml, `/shop/${product.id}/desk-organizer</loc>`)
    assert.notInclude(xml, `/shop/${hidden.id}/`)
    assert.include(xml, '/shop</loc>')
  })

  test('robots.txt blocks private areas and points to the sitemap', async ({ client, assert }) => {
    const response = await client.get('/robots.txt')
    response.assertStatus(200)
    const txt = response.text()
    for (const line of [
      'Disallow: /admin',
      'Disallow: /orders',
      'Disallow: /webhooks',
      'Sitemap: ',
    ]) {
      assert.include(txt, line)
    }
    assert.include(txt, '/sitemap.xml')
  })
})

test.group('storefront ordering', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('guests are sent to login and no order is created', async ({ client, assert }) => {
    const { product } = await createStorefrontProduct()
    const response = await client
      .post(`/shop/${product.id}/order`)
      .withCsrfToken()
      .redirects(0)
      .json({ material: 'PLA', quantity: 1, shippingAddress: TR_ADDRESS })
    response.assertStatus(302)
    assert.equal(
      await Order.query()
        .count('* as n')
        .first()
        .then((r) => Number(r?.$extras.n)),
      0
    )
  })

  test('a logged-in buyer creates a storefront draft and lands on the order page', async ({
    client,
    assert,
  }) => {
    const { product, sellerUser } = await createStorefrontProduct()
    const buyer = await createUser('buyer')
    await new RoleService().assignRole(buyer, 'seller')

    const response = await client
      .post(`/shop/${product.id}/order`)
      .withCsrfToken()
      .loginAs(buyer)
      .redirects(0)
      .json({ material: 'PETG', quantity: 3, shippingAddress: TR_ADDRESS })

    response.assertStatus(302)
    const order = await Order.query().where('buyerId', buyer.id).firstOrFail()
    assert.equal(response.header('location'), `/orders/${order.id}`)
    assert.equal(order.channel, 'storefront')
    assert.equal(order.sellerId, sellerUser.id)
    assert.equal(order.status, 'draft')
  })

  test('client-sent prices are ignored and bad input is rejected', async ({ client, assert }) => {
    const { product } = await createStorefrontProduct({ materials: ['PLA'] })
    const buyer = await createUser('buyer')
    await new RoleService().assignRole(buyer, 'seller')

    const bad = await client
      .post(`/shop/${product.id}/order`)
      .withCsrfToken()
      .loginAs(buyer)
      .redirects(0)
      .json({ material: 'GOLD', quantity: 1, shippingAddress: TR_ADDRESS })
    assert.equal(bad.status(), 302)
    assert.equal(
      await Order.query()
        .where('buyerId', buyer.id)
        .count('* as n')
        .first()
        .then((r) => Number(r?.$extras.n)),
      0
    )

    await client
      .post(`/shop/${product.id}/order`)
      .withCsrfToken()
      .loginAs(buyer)
      .redirects(0)
      .json({
        material: 'PLA',
        quantity: 1,
        totalMinor: 1,
        unitCostMinor: 1,
        shippingAddress: TR_ADDRESS,
      })
    const order = await Order.query().where('buyerId', buyer.id).firstOrFail()
    assert.isAbove(order.totalMinor, 1)
  })
})
