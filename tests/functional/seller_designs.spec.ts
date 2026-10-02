import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import CatalogProduct from '#models/catalog_product'
import SellerProduct from '#models/seller_product'
import RoleService from '#services/identity/role_service'
import StorefrontService from '#services/storefront/storefront_service'
import OrderService from '#services/orders/order_service'
import {
  TR_ADDRESS,
  createAnalyzedFile,
  createStorefrontProduct,
  createUser,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'

const INERTIA = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }

async function sellerWithFile() {
  const shop = await createStorefrontProduct()
  await new RoleService().assignRole(shop.sellerUser, 'seller')
  const file = await createAnalyzedFile(shop.sellerUser)
  return { ...shop, file }
}

const design = (modelFileId: string, extra: Record<string, unknown> = {}) => ({
  modelFileId,
  title: 'Lattice lamp',
  description: 'A lamp shade with a lattice',
  materials: ['pla', 'PETG'],
  scales: [50, 150],
  tags: ['Lamp', 'home'],
  marginBps: 3000,
  rightsConfirmed: true,
  ...extra,
})

test.group('W1: a product from the seller’s own design', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('creates a private catalogue entry and a draft product on the seller’s file', async ({
    client,
    assert,
  }) => {
    const { sellerUser, file } = await sellerWithFile()
    const response = await client
      .post('/seller/products/design')
      .loginAs(sellerUser)
      .withCsrfToken()
      .headers(INERTIA)
      .redirects(0)
      .json(design(file.id))
    response.assertStatus(302)

    const catalog = await CatalogProduct.query().where('modelFileId', file.id).firstOrFail()
    assert.equal(catalog.ownerUserId, sellerUser.id)
    assert.deepEqual(catalog.allowedMaterials, ['PLA', 'PETG'])
    assert.deepEqual(catalog.allowedScales, [50, 100, 150])
    assert.deepEqual(catalog.tags, ['lamp', 'home'])
    const product = await SellerProduct.query().where('catalogProductId', catalog.id).firstOrFail()
    assert.equal(product.title, 'Lattice lamp')
    assert.equal(product.marginBps, 3000)
    assert.equal(product.status, 'draft')
    assert.isTrue(product.shopListed)

    // one product per file
    const again = await client
      .post('/seller/products/design')
      .loginAs(sellerUser)
      .withCsrfToken()
      .header('accept', 'application/json')
      .json(design(file.id))
    again.assertStatus(422)
  })

  test('refuses someone else’s file, an unchecked or blocked file and unknown materials', async ({
    client,
    assert,
  }) => {
    const { sellerUser, file } = await sellerWithFile()
    const stranger = await createUser('stranger')
    const theirs = await createAnalyzedFile(stranger)
    const post = (body: Record<string, unknown>) =>
      client
        .post('/seller/products/design')
        .loginAs(sellerUser)
        .withCsrfToken()
        .header('accept', 'application/json')
        .json(body)

    const notMine = await post(design(theirs.id))
    notMine.assertStatus(404)

    file.analysisStatus = 'pending'
    await file.save()
    const unchecked = await post(design(file.id))
    unchecked.assertStatus(422)

    file.analysisStatus = 'done'
    file.blockedAt = DateTime.now()
    await file.save()
    const blocked = await post(design(file.id))
    blocked.assertStatus(422)

    file.blockedAt = null
    await file.save()
    const unknown = await post(design(file.id, { materials: ['UNOBTAINIUM'] }))
    unknown.assertStatus(422)
    const noRights = await post(design(file.id, { rightsConfirmed: false }))
    noRights.assertStatus(422)
    assert.lengthOf(await CatalogProduct.query().whereNotNull('ownerUserId'), 0)
  })

  test('an own design is not offered to other sellers; only its owner previews its margin', async ({
    client,
    assert,
  }) => {
    const { sellerUser, file } = await sellerWithFile()
    await client
      .post('/seller/products/design')
      .loginAs(sellerUser)
      .withCsrfToken()
      .headers(INERTIA)
      .json(design(file.id))
    const catalog = await CatalogProduct.query().where('modelFileId', file.id).firstOrFail()

    const other = await createStorefrontProduct()
    await new RoleService().assignRole(other.sellerUser, 'seller')
    const page = await client.get('/seller/products').loginAs(other.sellerUser).headers(INERTIA)
    const offered = page.body().props.catalogProducts.map((c: { id: string }) => c.id)
    assert.notInclude(offered, catalog.id)

    // listing it on someone else's design is refused
    const steal = await client
      .post('/seller/products')
      .loginAs(other.sellerUser)
      .withCsrfToken()
      .headers(INERTIA)
      .redirects(0)
      .json({ catalogProductId: catalog.id, title: 'Mine now' })
    steal.assertStatus(302)
    assert.lengthOf(await SellerProduct.query().where('catalogProductId', catalog.id), 1)

    const theirPreview = await client
      .get(`/seller/margin-preview?catalogProductId=${catalog.id}&marginBps=2000`)
      .loginAs(other.sellerUser)
    assert.deepEqual(theirPreview.body().options, [])
  })

  test('the owner edits materials and sizes; "only in my shops" hides it from the Fabrmatch shop', async ({
    client,
    assert,
  }) => {
    const { sellerUser, file, admin } = await sellerWithFile()
    await client
      .post('/seller/products/design')
      .loginAs(sellerUser)
      .withCsrfToken()
      .headers(INERTIA)
      .json(design(file.id))
    const product = await SellerProduct.query()
      .whereHas('catalogProduct', (q) => q.where('modelFileId', file.id))
      .firstOrFail()
    product.status = 'active'
    await product.save()
    assert.isNotNull(await new StorefrontService().find(product.id))

    const update = await client
      .put(`/seller/products/${product.id}`)
      .loginAs(sellerUser)
      .withCsrfToken()
      .headers(INERTIA)
      .redirects(0)
      .json({ materials: ['PLA'], scales: [200], shopListed: false })
    update.assertStatus(303)
    await product.refresh()
    await product.load('catalogProduct')
    assert.deepEqual(product.catalogProduct.allowedMaterials, ['PLA'])
    assert.deepEqual(product.catalogProduct.allowedScales, [100, 200])
    assert.isFalse(product.shopListed)

    assert.isNull(await new StorefrontService().find(product.id))
    const buyer = await createUser('buyer')
    await assert.rejects(
      () =>
        new OrderService().createStorefrontDraft(buyer, product.id, {
          material: 'PLA',
          quantity: 1,
          shippingAddress: TR_ADDRESS,
        } as never),
      /not available/
    )
    // the seller can still order it (a sample) for themselves
    assert.exists(admin)
  })

  test('the products page shows a seller’s own files that can become products', async ({
    client,
    assert,
  }) => {
    const { sellerUser, file } = await sellerWithFile()
    const page = await client.get('/seller/products').loginAs(sellerUser).headers(INERTIA)
    page.assertStatus(200)
    const files = page.body().props.designFiles.map((f: { id: string }) => f.id)
    assert.include(files, file.id)
    assert.isAbove(page.body().props.materials.length, 0)
  })
})
