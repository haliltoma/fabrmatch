import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import ModelFile from '#models/model_file'
import StorefrontService, { slugify, unitPriceFor } from '#services/storefront/storefront_service'
import OrderService, { OrderInputError } from '#services/orders/order_service'
import { TR_ADDRESS, createStorefrontProduct, createUser } from '#tests/helpers/order_fixtures'

const shop = new StorefrontService()

test.group('StorefrontService: visibility', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('an active, modelled product is listed with a computed from-price', async ({ assert }) => {
    const { product } = await createStorefrontProduct()
    const { items, total } = await shop.list()
    assert.equal(total, 1)
    assert.equal(items[0].id, product.id)
    assert.equal(items[0].slug, 'desk-organizer')
    assert.deepEqual(items[0].materials, ['PLA', 'PETG'])
    assert.isAbove(items[0].fromPriceMinor, 0)
    assert.isTrue(Number.isInteger(items[0].fromPriceMinor))
  })

  test('draft/archived products, inactive catalog entries and missing/unanalyzed models are hidden', async ({
    assert,
  }) => {
    await createStorefrontProduct({ productStatus: 'draft' })
    await createStorefrontProduct({ productStatus: 'archived' })
    await createStorefrontProduct({ catalogActive: false })
    await createStorefrontProduct({ withModel: false })
    await createStorefrontProduct({ analyzed: false })
    const visible = await createStorefrontProduct({ title: 'Visible One' })

    const { items } = await shop.list()
    assert.deepEqual(
      items.map((i) => i.id),
      [visible.product.id]
    )
    assert.isNull(await shop.find(999_999))
  })

  test('find() returns per-material prices and never exposes internal fields', async ({
    assert,
  }) => {
    const { product } = await createStorefrontProduct()
    const detail = await shop.find(product.id)
    assert.isNotNull(detail)
    assert.lengthOf(detail!.options, 2)
    assert.deepEqual(detail!.bboxMm, [20, 20, 20])
    const serialized = JSON.stringify(detail)
    for (const forbidden of [
      'sellerProfileId',
      'marginBps',
      'manufacturer',
      'storageKey',
      'modelFile',
    ]) {
      assert.notInclude(serialized, forbidden)
    }
  })

  test('a tiny material list with an unknown material skips it instead of failing', async ({
    assert,
  }) => {
    await createStorefrontProduct({ materials: ['PLA', 'UNOBTAINIUM'] })
    const { items } = await shop.list()
    assert.deepEqual(items[0].materials, ['PLA'])
  })
})

test.group('StorefrontService: search, filters, sorting', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('full-text search matches title and description; ranks and excludes', async ({ assert }) => {
    const a = await createStorefrontProduct({
      title: 'Dragon Figurine',
      description: 'fantasy miniature',
    })
    await createStorefrontProduct({
      title: 'Phone Stand',
      description: 'holds a dragon poster too',
    })
    await createStorefrontProduct({ title: 'Plant Pot', description: 'round pot' })

    const byTitle = await shop.list({ q: 'dragon' })
    assert.equal(byTitle.total, 2)
    assert.equal(byTitle.items[0].id, a.product.id)

    const byDescription = await shop.list({ q: 'miniature' })
    assert.equal(byDescription.total, 1)
    const none = await shop.list({ q: 'nonexistentword' })
    assert.equal(none.total, 0)
  })

  test('search input is safe against tsquery syntax', async ({ assert }) => {
    await createStorefrontProduct()
    for (const q of ["'", '&', '!!', ') | (', 'a:*b', "'; drop table seller_products; --"]) {
      const result = await shop.list({ q })
      assert.isAtLeast(result.total, 0)
    }
  })

  test('material filter uses the catalog allow-list', async ({ assert }) => {
    await createStorefrontProduct({ title: 'Only PLA', materials: ['PLA'] })
    const petg = await createStorefrontProduct({ title: 'With PETG', materials: ['PLA', 'PETG'] })
    const result = await shop.list({ material: 'petg' })
    assert.deepEqual(
      result.items.map((i) => i.id),
      [petg.product.id]
    )
  })

  test('price sorting and price range work on the computed price', async ({ assert }) => {
    const small = await createStorefrontProduct({ title: 'Small', volumeMm3: 4000 })
    const big = await createStorefrontProduct({ title: 'Big', volumeMm3: 400_000 })

    const asc = await shop.list({ sort: 'price_asc' })
    assert.deepEqual(
      asc.items.map((i) => i.id),
      [small.product.id, big.product.id]
    )
    const desc = await shop.list({ sort: 'price_desc' })
    assert.equal(desc.items[0].id, big.product.id)

    const bigPrice = desc.items[0].fromPriceMinor
    const atLeast = await shop.list({ minPriceMinor: bigPrice })
    assert.deepEqual(
      atLeast.items.map((i) => i.id),
      [big.product.id]
    )
    const atMost = await shop.list({ maxPriceMinor: bigPrice - 1 })
    assert.deepEqual(
      atMost.items.map((i) => i.id),
      [small.product.id]
    )
  })

  test('pagination is clamped and consistent', async ({ assert }) => {
    for (let i = 0; i < 5; i++) await createStorefrontProduct({ title: `Item ${i}` })
    const first = await shop.list({ perPage: 2, page: 1 })
    const last = await shop.list({ perPage: 2, page: 3 })
    assert.equal(first.total, 5)
    assert.lengthOf(first.items, 2)
    assert.lengthOf(last.items, 1)
    const all = await shop.list({ perPage: 9999 })
    assert.lengthOf(all.items, 5)
  })

  test('slugify handles Turkish characters and junk', ({ assert }) => {
    assert.equal(slugify('Çiçek Saksısı & Ğüneş!'), 'cicek-saksisi-gunes')
    assert.equal(slugify('!!!'), 'product')
  })
})

test.group('OrderService.createStorefrontDraft', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('builds a storefront order priced server-side, crediting the product seller', async ({
    assert,
  }) => {
    const { product, sellerUser, catalog } = await createStorefrontProduct({ marginBps: 3000 })
    const buyer = await createUser('buyer')

    const order = await new OrderService().createStorefrontDraft(buyer, product.id, {
      material: 'PETG',
      quantity: 2,
      shippingAddress: TR_ADDRESS,
    })
    await order.load('items')

    assert.equal(order.channel, 'storefront')
    assert.equal(order.buyerId, buyer.id)
    assert.equal(order.sellerId, sellerUser.id)
    assert.equal(order.items[0].modelFileId, catalog.modelFileId)
    assert.equal(order.items[0].material, 'PETG')
    assert.isAbove(order.sellerShareMinor, 0)

    const file = await ModelFile.findOrFail(catalog.modelFileId!)
    const unit = unitPriceFor(product, file, 'PETG')!
    assert.isAbove(unit, 0)
    assert.equal(order.totalMinor, order.subtotalMinor + order.shippingMinor)
    assert.isAbove(order.shippingMinor, 0)
    assert.equal(order.status, 'draft')
  })

  test('rejects unavailable products and materials outside the allow-list', async ({ assert }) => {
    const buyer = await createUser('buyer')
    const service = new OrderService()
    const base = { quantity: 1, shippingAddress: TR_ADDRESS }

    const ok = await createStorefrontProduct({ materials: ['PLA'] })
    await assert.rejects(
      () => service.createStorefrontDraft(buyer, ok.product.id, { ...base, material: 'ABS' }),
      OrderInputError as never
    )
    for (const hidden of [
      await createStorefrontProduct({ productStatus: 'draft' }),
      await createStorefrontProduct({ catalogActive: false }),
      await createStorefrontProduct({ withModel: false }),
      await createStorefrontProduct({ analyzed: false }),
    ]) {
      await assert.rejects(
        () => service.createStorefrontDraft(buyer, hidden.product.id, { ...base, material: 'PLA' }),
        OrderInputError as never
      )
    }
    await assert.rejects(
      () => service.createStorefrontDraft(buyer, 999_999, { ...base, material: 'PLA' }),
      OrderInputError as never
    )
  })
})
