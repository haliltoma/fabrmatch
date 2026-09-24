import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import CatalogProduct from '#models/catalog_product'
import CatalogService, { normaliseTags } from '#services/catalog/catalog_service'
import CategoryService, { CategoryError } from '#services/catalog/category_service'
import StorefrontService from '#services/storefront/storefront_service'
import { createStorefrontProduct, createUser } from '#tests/helpers/order_fixtures'

test.group('categories and tags (R4-T10)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  const categories = new CategoryService()

  test('tags are normalised: lower case, unique, at most eight', ({ assert }) => {
    assert.deepEqual(normaliseTags([' Desk ', 'desk', 'Gift', 'x']), ['desk', 'gift'])
    assert.lengthOf(normaliseTags(Array.from({ length: 12 }, (_, i) => `tag${i}`)), 8)
    assert.deepEqual(normaliseTags(undefined), [])
  })

  test('an admin creates categories with a slug; duplicates and blanks are refused', async ({
    assert,
  }) => {
    const admin = await createUser('admin')
    const c = await categories.create('Home & Office', admin.id)
    assert.equal(c.slug, 'home-and-office')
    await assert.rejects(() => categories.create('home and office', admin.id), /already exists/)
    await assert.rejects(() => categories.create(' ', admin.id), CategoryError)
    await categories.setActive(c.id, false, admin.id)
    const listed = await categories.list()
    assert.isFalse(listed[0].isActive)
  })

  test('the shop filters by category and tag and lists only categories in use', async ({
    assert,
  }) => {
    const admin = await createUser('admin')
    const desk = await categories.create('Desk', admin.id)
    const toys = await categories.create('Toys', admin.id)
    const a = await createStorefrontProduct()
    const b = await createStorefrontProduct()
    await new CatalogService().update(a.catalog, {
      categoryId: desk.id,
      tags: ['Organiser', 'gift'],
    })
    await new CatalogService().update(b.catalog, { categoryId: toys.id, tags: ['gift'] })

    const shop = new StorefrontService()
    const idsOf = async (filters: Parameters<StorefrontService['list']>[0]) => {
      const result = await shop.list(filters)
      return result.items.map((i) => i.id).sort()
    }
    assert.deepEqual(await idsOf({ category: 'desk' }), [a.product.id])
    assert.deepEqual(await idsOf({ category: 'toys' }), [b.product.id])
    assert.deepEqual(await idsOf({ tag: 'GIFT' }), [a.product.id, b.product.id].sort())
    assert.deepEqual(await idsOf({ tag: 'organiser' }), [a.product.id])
    assert.deepEqual(await idsOf({ category: 'nope' }), [])

    const inUse = await shop.categoriesInUse()
    assert.deepEqual(inUse.map((c) => c.slug).sort(), ['desk', 'toys'])
    await categories.setActive(toys.id, false, admin.id)
    const remaining = await shop.categoriesInUse()
    assert.deepEqual(
      remaining.map((c) => c.slug),
      ['desk']
    )
    assert.deepEqual(await idsOf({ category: 'toys' }), [], 'a retired category no longer filters')
  })

  test('cards carry their category and tags', async ({ assert }) => {
    const admin = await createUser('admin')
    const desk = await categories.create('Desk', admin.id)
    const p = await createStorefrontProduct()
    await new CatalogService().update(p.catalog, { categoryId: desk.id, tags: ['organiser'] })
    const found = await new StorefrontService().find(p.product.id)
    assert.deepEqual(found?.category, { slug: 'desk', name: 'Desk' })
    assert.deepEqual(found?.tags, ['organiser'])
    const stored = await CatalogProduct.findOrFail(p.catalog.id)
    assert.deepEqual(stored.tags, ['organiser'])
  })
})
