import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import drive from '@adonisjs/drive/services/main'
import app from '@adonisjs/core/services/app'
import { readFileSync } from 'node:fs'
import { DateTime } from 'luxon'
import JobQcPhoto from '#models/job_qc_photo'
import ModelFile from '#models/model_file'
import ProductImage from '#models/product_image'
import ProductionJob from '#models/production_job'
import OrderService from '#services/orders/order_service'
import RoleService from '#services/identity/role_service'
import ProductImageService from '#services/catalog/product_image_service'
import {
  TR_ADDRESS,
  createDraftOrder,
  createManufacturer,
  createPrinter,
  createStorefrontProduct,
  createUser,
} from '#tests/helpers/order_fixtures'

const inertia = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }
const VASE = readFileSync(app.makePath('public/samples/sample-vase.stl'))

async function renderedShopProduct() {
  const shop = await createStorefrontProduct()
  const file = await ModelFile.findOrFail(shop.catalog.modelFileId!)
  await drive.use('s3').put(file.storageKey, VASE)
  await new ProductImageService().renderModel(file.id)
  return { ...shop, file }
}

/** A maker's job for an order, with one QC photo on it. */
async function jobWithPhoto(orderId: number) {
  const { user, profile } = await createManufacturer()
  await new RoleService().assignRole(user, 'manufacturer')
  const printer = await createPrinter(profile)
  const job = await ProductionJob.create({
    orderId,
    manufacturerProfileId: profile.id,
    printerId: printer.id,
    status: 'shipped',
    acceptedAt: DateTime.now(),
    dueAt: DateTime.now().plus({ days: 5 }),
  })
  const storageKey = `qc/${job.id}/photo.jpg`
  await drive.use('s3').put(storageKey, Buffer.from('jpeg bytes'))
  const photo = await JobQcPhoto.create({ productionJobId: job.id, storageKey })
  return { user, profile, job, photo }
}

test.group('shop pictures (R4-T6)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => {
    drive.fake('s3')
    return () => drive.restore('s3')
  })

  test('the shop card and product page carry the renders; the image route serves them', async ({
    client,
    assert,
  }) => {
    const { product } = await renderedShopProduct()

    const list = await client.get('/shop').headers(inertia)
    const card = list.body().props.items.find((i: { id: number }) => i.id === product.id)
    assert.equal(card.image.kind, 'render')

    const page = await client.get(`/shop/${product.id}/desk-organizer`).headers(inertia)
    const images = page.body().props.product.images
    assert.lengthOf(images, 8)
    assert.include(page.body().props.jsonLd, '/images/')

    const img = await client.get(images[0].url)
    img.assertStatus(200)
    img.assertHeader('content-type', 'image/png')
    assert.include(img.header('cache-control'), 'public')
  })

  test('a pending maker photo is not public; the admin sees it and approves it', async ({
    client,
    assert,
  }) => {
    const { product, file } = await renderedShopProduct()
    const buyer = await createUser('buyer')
    await new RoleService().assignRole(buyer, 'seller')
    const order = await new OrderService().createStorefrontDraft(buyer, product.id, {
      material: 'PLA',
      quantity: 1,
      shippingAddress: TR_ADDRESS,
    })
    const { user: makerUser, photo } = await jobWithPhoto(order.id)

    const offer = await client
      .post(`/maker/qc-photos/${photo.id}/offer`)
      .withCsrfToken()
      .loginAs(makerUser)
      .headers(inertia)
      .redirects(0)
    offer.assertStatus(302)
    const image = await ProductImage.query().where('qcPhotoId', photo.id).firstOrFail()
    assert.equal(image.status, 'pending')
    assert.equal(image.modelFileId, file.id)

    const res1 = await client.get(`/images/${image.id}`)

    res1.assertStatus(404)

    const admin = await createUser('admin')
    await new RoleService().assignRole(admin, 'admin')
    const queue = await client.get('/admin/queues').loginAs(admin).headers(inertia)
    assert.lengthOf(queue.body().props.shopPhotos, 1)
    const res2 = await client.get(`/admin/images/${image.id}`).loginAs(admin)

    res2.assertStatus(200)

    await client
      .post(`/admin/queues/photos/${image.id}`)
      .withCsrfToken()
      .loginAs(admin)
      .headers(inertia)
      .json({ decision: 'approve' })
    await image.refresh()
    assert.equal(image.status, 'approved')
    const res3 = await client.get(`/images/${image.id}`)

    res3.assertStatus(200)

    // the real photo comes before the renders
    const page = await client.get(`/shop/${product.id}/desk-organizer`).headers(inertia)
    assert.equal(page.body().props.product.images[0].kind, 'maker_photo')
  })

  test("a photo of a buyer's own model can never be offered for the shop", async ({
    client,
    assert,
  }) => {
    const { order } = await createDraftOrder()
    const { user: makerUser, photo } = await jobWithPhoto(order.id)

    await client
      .post(`/maker/qc-photos/${photo.id}/offer`)
      .withCsrfToken()
      .loginAs(makerUser)
      .headers(inertia)
    assert.isNull(await ProductImage.findBy('qcPhotoId', photo.id))
  })

  test("a maker cannot offer another maker's photo", async ({ client, assert }) => {
    const { product } = await renderedShopProduct()
    const buyer = await createUser('buyer')
    await new RoleService().assignRole(buyer, 'seller')
    const order = await new OrderService().createStorefrontDraft(buyer, product.id, {
      material: 'PLA',
      quantity: 1,
      shippingAddress: TR_ADDRESS,
    })
    const { photo } = await jobWithPhoto(order.id)
    const otherOrder = await new OrderService().createStorefrontDraft(buyer, product.id, {
      material: 'PLA',
      quantity: 1,
      shippingAddress: TR_ADDRESS,
    })
    const { user: other } = await jobWithPhoto(otherOrder.id)

    await client
      .post(`/maker/qc-photos/${photo.id}/offer`)
      .withCsrfToken()
      .loginAs(other)
      .headers(inertia)
    assert.isNull(await ProductImage.findBy('qcPhotoId', photo.id))
  })

  test('the admin image route is admin only', async ({ client }) => {
    const { file } = await renderedShopProduct()
    const image = await ProductImage.query().where('modelFileId', file.id).firstOrFail()
    const seller = await createUser('seller')
    await new RoleService().assignRole(seller, 'seller')
    const res4 = await client.get(`/admin/images/${image.id}`).loginAs(seller)

    res4.assertStatus(403)
  })
})
