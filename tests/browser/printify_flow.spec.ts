import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import fabrmatchConfig from '#config/fabrmatch'
import ExternalListing from '#models/external_listing'
import ExternalOrder from '#models/external_order'
import OrderItem from '#models/order_item'
import ProductionJob from '#models/production_job'
import SellerProduct from '#models/seller_product'
import StoreConnection from '#models/store_connection'
import RoleService from '#services/identity/role_service'
import FakeStoreAdapter from '#services/integrations/stores/fake_store_adapter'
import { setStoreAdapter } from '#services/integrations/stores/store_registry'
import StoreService from '#services/integrations/stores/store_service'
import FulfillmentService from '#services/orders/fulfillment_service'
import OrderStateMachine from '#services/orders/order_state_machine'
import {
  TR_ADDRESS,
  addQcPhoto,
  createAnalyzedFile,
  createManufacturer,
  createPrinter,
  createStorefrontProduct,
  resetDatabase,
} from '#tests/helpers/order_fixtures'

const SHOTS = process.env.SHOTS_DIR
const flags = fabrmatchConfig.flags as Record<string, number>

/**
 * W6, the whole Printify-style path in a real browser: the seller turns their own model into a
 * product, puts it on sale, publishes it with colour variants to their shop; the shop's paid order
 * becomes a Fabrmatch order with that colour, a maker ships it, and the tracking goes back.
 */
test.group('Printify flow: own design → shop → order → tracking (browser)', (group) => {
  let shop: FakeStoreAdapter
  group.each.setup(() => resetDatabase())
  group.each.setup(() => {
    flags.externalStores = 1
    shop = new FakeStoreAdapter()
    setStoreAdapter('fake', shop)
    return () => {
      flags.externalStores = 0
      setStoreAdapter('fake', null)
    }
  })

  test('the seller’s design sells in their shop in the colour the customer picked', async ({
    visit,
    assert,
  }) => {
    const made = await createStorefrontProduct()
    const seller = made.sellerUser
    await new RoleService().assignRole(seller, 'seller')
    const file = await createAnalyzedFile(seller)
    file.originalName = 'lattice-lamp.stl'
    await file.save()

    const page = await visit('/login')
    await page.getByLabel('Email').fill(seller.email)
    await page.getByLabel('Password').fill('password123')
    await page.getByRole('button', { name: 'Log in' }).click()
    await page.waitForURL((url) => !url.pathname.startsWith('/login'))
    const origin = page.url().split('/').slice(0, 3).join('/')

    // 1. own design → product
    await page.goto(`${origin}/seller/products`)
    await page.getByRole('button', { name: 'Add product' }).first().click()
    await page.getByLabel('Your model').selectOption(file.id)
    await page.locator('#design-title').fill('Lattice lamp')
    await page.getByLabel('PETG').check()
    await page.getByText('This is my own design').click()
    await page.getByRole('button', { name: 'Create product' }).click()
    await page.getByText('Your design').waitFor()
    const product = await SellerProduct.query()
      .where('title', 'Lattice lamp')
      .preload('catalogProduct')
      .firstOrFail()
    assert.equal(product.catalogProduct.ownerUserId, seller.id)
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/printify-products.png`, fullPage: true })

    // 2. on sale, then a test shop and publish with colours
    const card = page.locator('div', { has: page.getByRole('heading', { name: 'Lattice lamp' }) })
    await card.getByRole('button', { name: 'Put on sale' }).first().click()
    await page.getByText('In the Fabrmatch shop').first().waitFor()
    await page.goto(`${origin}/seller/stores`)
    await page.getByRole('button', { name: 'Add a test shop' }).click()
    await page.getByText('Publish a product to Test shop').waitFor()
    await page.goto(`${origin}/seller/stores?product=${product.id}`)
    const form = page.locator('form', { has: page.locator('#pub-product') })
    assert.equal(await page.locator('#pub-product').inputValue(), product.id)
    await form.getByLabel('Black').check()
    await form.getByLabel('White').check()
    await page.getByText('4 variants in your shop').waitFor()
    if (SHOTS) await form.screenshot({ path: `${SHOTS}/printify-publish.png` })
    await form.getByRole('button', { name: 'Publish to my shop' }).click()
    await page.getByText('Published to your shop.').waitFor()

    const connection = await StoreConnection.query()
      .where('sellerUserId', seller.id)
      .where('provider', 'fake')
      .firstOrFail()
    const listings = await ExternalListing.query()
      .where('storeConnectionId', connection.id)
      .where('sellerProductId', product.id)
      .where('published', true)
    assert.sameMembers(
      listings.map((l) => `${l.material}/${l.color}`),
      ['PLA/Black', 'PLA/White', 'PETG/Black', 'PETG/White']
    )

    // 3. the shop sends a paid order for the white PETG lamp (signed webhook, over HTTP)
    const white = listings.find((l) => l.material === 'PETG' && l.color === 'White')!
    const { body, headers } = shop.signedOrder(connection, {
      externalOrderId: 'shop-5001',
      name: '#5001',
      lines: [{ variantId: white.externalVariantId, sku: white.sku, title: 'Lamp', quantity: 1 }],
      shippingAddress: TR_ADDRESS,
    })
    const delivered = await page.request.post(`${origin}/webhooks/stores/${connection.id}/orders`, {
      data: body,
      headers: { 'content-type': 'application/json', ...headers },
    })
    assert.equal(delivered.status(), 200)
    const external = await ExternalOrder.findByOrFail('externalOrderId', 'shop-5001')
    assert.equal(external.status, 'placed')
    const item = await OrderItem.findByOrFail('orderId', external.orderId!)
    assert.deepEqual([item.material, item.color], ['PETG', 'White'])

    // 4. paid (payment itself is covered elsewhere), a maker prints and ships it
    const sm = new OrderStateMachine()
    for (const to of ['awaiting_payment', 'paid', 'matching', 'in_production'] as const) {
      await sm.transition(external.orderId!, to)
    }
    const { profile } = await createManufacturer()
    const printer = await createPrinter(profile)
    const job = await ProductionJob.create({
      orderId: external.orderId!,
      manufacturerProfileId: profile.id,
      printerId: printer.id,
      status: 'produced',
      acceptedAt: DateTime.now(),
      dueAt: DateTime.now().plus({ days: 5 }),
    })
    await addQcPhoto(job.id)
    await new FulfillmentService().markShipped(job.id, profile.id, {
      carrier: 'Yurtiçi',
      trackingNumber: 'YK5001',
    })
    await new StoreService().pushPendingFulfillments()
    assert.deepEqual(shop.fulfillments, [
      { externalOrderId: 'shop-5001', carrier: 'Yurtiçi', trackingNumber: 'YK5001' },
    ])

    // 5. the seller sees it, and never who printed it (rule 1)
    await page.goto(`${origin}/seller/stores`)
    await page.getByText('#5001').first().waitFor()
    const text = await page.locator('main').innerText()
    assert.notInclude(text, profile.id)
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/printify-orders.png`, fullPage: true })
  })
})
