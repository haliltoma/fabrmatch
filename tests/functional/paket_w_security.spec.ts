import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import AuditLog from '#models/audit_log'
import ModelFile from '#models/model_file'
import ProductImage from '#models/product_image'
import ProductionJob from '#models/production_job'
import WebhookDelivery from '#models/webhook_delivery'
import ProductImageService from '#services/catalog/product_image_service'
import ApiKeyService from '#services/integrations/api_key_service'
import WebhookService from '#services/integrations/webhook_service'
import RoleService from '#services/identity/role_service'
import OrderService from '#services/orders/order_service'
import OrderStateMachine from '#services/orders/order_state_machine'
import {
  TR_ADDRESS,
  createAnalyzedFile,
  createManufacturer,
  createPrinter,
  createStorefrontProduct,
  createUser,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'

/** W7: findings of the Paket W security review, each kept fixed by a test. */
test.group('Paket W security review (W7)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('F2: a Fabrmatch shop sale never hands its tracking to the seller', async ({
    client,
    assert,
  }) => {
    const shop = await createStorefrontProduct()
    await new RoleService().assignRole(shop.sellerUser, 'seller')
    await new WebhookService().createEndpoint(shop.sellerUser.id, 'https://hooks.example.com/fm')
    const { key } = await new ApiKeyService().create(shop.sellerUser.id, 'Site')
    const buyer = await createUser('buyer')
    const order = await new OrderService().createStorefrontDraft(buyer, shop.product.id, {
      material: 'PLA',
      quantity: 1,
      shippingAddress: TR_ADDRESS,
    })
    const sm = new OrderStateMachine()
    for (const to of ['awaiting_payment', 'paid', 'matching', 'in_production'] as const) {
      await sm.transition(order.id, to)
    }
    const { profile } = await createManufacturer()
    const printer = await createPrinter(profile)
    await ProductionJob.create({
      orderId: order.id,
      manufacturerProfileId: profile.id,
      printerId: printer.id,
      status: 'shipped',
      acceptedAt: DateTime.now(),
      dueAt: DateTime.now().plus({ days: 5 }),
      carrier: 'Yurtiçi',
      trackingNumber: 'SECRET-TRACK-1',
    })
    await sm.transition(order.id, 'shipped')

    const read = await client
      .get(`/api/v1/orders/${order.id}`)
      .headers({ authorization: `Bearer ${key}` })
    read.assertStatus(200)
    assert.isNull(read.body().data.tracking)
    const deliveries = await WebhookDelivery.all()
    assert.isAbove(deliveries.length, 0)
    assert.notInclude(JSON.stringify(deliveries.map((d) => d.payload)), 'SECRET-TRACK-1')
  })

  test('F3: an order through the API records which key placed it', async ({ client, assert }) => {
    const shop = await createStorefrontProduct()
    await new RoleService().assignRole(shop.sellerUser, 'seller')
    const { key, record } = await new ApiKeyService().create(
      shop.sellerUser.id,
      'Site',
      'read_write'
    )
    const placed = await client
      .post('/api/v1/orders')
      .headers({ authorization: `Bearer ${key}` })
      .json({
        externalId: 'audit-1',
        lines: [{ productId: shop.product.id, material: 'PLA', quantity: 1 }],
        shippingAddress: TR_ADDRESS,
      })
    placed.assertStatus(201)
    const log = await AuditLog.query()
      .where('action', 'api.order_created')
      .where('subjectId', placed.body().data.id)
      .firstOrFail()
    assert.equal(log.meta.apiKeyId, record.id)
  })

  test('F1: a big model’s colour pictures are left to the worker, not drawn in the request', async ({
    assert,
  }) => {
    const owner = await createUser('owner')
    const file = await createAnalyzedFile(owner)
    await ModelFile.query().where('id', file.id).update({ triangleCount: 500_000 })
    const drawn = await new ProductImageService().colourRenders(file.id, ['#111111'])
    assert.equal(drawn.size, 0)
    assert.lengthOf(await ProductImage.query().where('modelFileId', file.id), 0)
  })

  test('C1: a design with an unknown category is refused, not a server error', async ({
    client,
  }) => {
    const shop = await createStorefrontProduct()
    await new RoleService().assignRole(shop.sellerUser, 'seller')
    const file = await createAnalyzedFile(shop.sellerUser)
    const response = await client
      .post('/seller/products/design')
      .loginAs(shop.sellerUser)
      .withCsrfToken()
      .header('accept', 'application/json')
      .json({
        modelFileId: file.id,
        title: 'Lamp',
        materials: ['PLA'],
        categoryId: '01a0f67a-dccf-7ac1-bc9e-e5f0df6f32d3',
        rightsConfirmed: true,
      })
    response.assertStatus(422)
  })
})
