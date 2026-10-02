import { test } from '@japa/runner'
import { readFile } from 'node:fs/promises'
import app from '@adonisjs/core/services/app'
import drive from '@adonisjs/drive/services/main'
import testUtils from '@adonisjs/core/services/test_utils'
import fabrmatchConfig from '#config/fabrmatch'
import ExternalListing from '#models/external_listing'
import ExternalOrder from '#models/external_order'
import ModelFile from '#models/model_file'
import OrderItem from '#models/order_item'
import ProductImage from '#models/product_image'
import RoleService from '#services/identity/role_service'
import StoreService from '#services/integrations/stores/store_service'
import FakeStoreAdapter from '#services/integrations/stores/fake_store_adapter'
import { setStoreAdapter } from '#services/integrations/stores/store_registry'
import { fabrmatchSku } from '#services/integrations/stores/store_adapter'
import {
  TR_ADDRESS,
  createStorefrontProduct,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'

const flags = fabrmatchConfig.flags as Record<string, number>

async function shopWithVase() {
  const made = await createStorefrontProduct({ materials: ['PLA', 'PETG'] })
  await new RoleService().assignRole(made.sellerUser, 'seller')
  made.catalog.allowedScales = [100, 150]
  await made.catalog.save()
  // the real sample model, so colour renders can be drawn
  const file = await ModelFile.findOrFail(made.catalog.modelFileId)
  await drive
    .use('s3')
    .put(file.storageKey, await readFile(app.makePath('public/samples/sample-vase.stl')))
  const stores = new StoreService()
  const connection = await stores.connectTestShop(made.sellerUser)
  return { ...made, stores, connection }
}

test.group('W3: colour × size variants in the seller’s shop', (group) => {
  let fake: FakeStoreAdapter
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(async () => {
    await ensureReferenceCatalog()
    flags.externalStores = 1
    drive.fake('s3')
    fake = new FakeStoreAdapter()
    setStoreAdapter('fake', fake)
    return () => {
      flags.externalStores = 0
      drive.restore('s3')
      setStoreAdapter('fake', null)
    }
  })

  test('publishes every material × size in each colour, with SKUs, sizes and colour pictures', async ({
    assert,
  }) => {
    const { product, sellerUser, stores, connection } = await shopWithVase()
    const variants = ['Black', 'White'].flatMap((color) => [
      { material: 'PLA', color, scalePercent: 100, priceMinor: 25_000 },
      { material: 'PLA', color, scalePercent: 150, priceMinor: 41_000 },
      { material: 'petg', color: color.toLowerCase(), scalePercent: 100, priceMinor: 29_000 },
    ])
    const result = await stores.publish(sellerUser, connection.id, product.id, variants)
    assert.lengthOf(result.variants, 6)

    const sent = fake.published.get(result.productId)!
    const big = sent.variants.find((v) => v.sku === fabrmatchSku(product.id, 'PLA', 'Black', 150))!
    assert.equal(big.color, 'Black')
    assert.equal(big.sizeLabel, '30 × 30 × 30 mm')
    assert.isAtMost(big.sku.length, 32)
    // canonical colour names, whatever case the form sent
    assert.sameMembers([...new Set(sent.variants.map((v) => v.color))], ['Black', 'White'])

    const listings = await ExternalListing.query()
      .where('storeConnectionId', connection.id)
      .where('published', true)
    assert.lengthOf(listings, 6)
    const white = listings.find((l) => l.sku === fabrmatchSku(product.id, 'PETG', 'White', 100))!
    assert.equal(white.color, 'White')
    assert.equal(white.material, 'PETG')
    assert.equal(white.scalePercent, 100)

    // one picture per colour, drawn once and reused
    const renders = await ProductImage.query().where('kind', 'colour_render')
    assert.sameMembers(
      renders.map((r) => r.colorHex),
      ['#111111', '#F5F5F0']
    )
    await stores.publish(sellerUser, connection.id, product.id, variants)
    assert.lengthOf(await ProductImage.query().where('kind', 'colour_render'), 2)
  })

  test('refuses an unknown colour, a size not offered, and colour on only some variants', async ({
    assert,
  }) => {
    const { product, sellerUser, stores, connection } = await shopWithVase()
    const publish = (variants: Array<Record<string, unknown>>) =>
      stores.publish(sellerUser, connection.id, product.id, variants as never)
    await assert.rejects(
      () => publish([{ material: 'PLA', color: 'Ultraviolet', priceMinor: 25_000 }]),
      /Unknown colour/
    )
    await assert.rejects(
      () => publish([{ material: 'PLA', scalePercent: 200, priceMinor: 25_000 }]),
      /not offered/
    )
    await assert.rejects(
      () =>
        publish([
          { material: 'PLA', color: 'Black', priceMinor: 25_000 },
          { material: 'PETG', priceMinor: 25_000 },
        ]),
      /every variant a colour, or none/
    )
  })

  test('dropping a colour takes its variants off sale; the others keep their ids', async ({
    assert,
  }) => {
    const { product, sellerUser, stores, connection } = await shopWithVase()
    const both = ['Black', 'White'].map((color) => ({
      material: 'PLA',
      color,
      priceMinor: 25_000,
    }))
    const first = await stores.publish(sellerUser, connection.id, product.id, both)
    const again = await stores.publish(sellerUser, connection.id, product.id, [both[0]])
    assert.equal(again.productId, first.productId)
    const listings = await ExternalListing.query()
      .where('storeConnectionId', connection.id)
      .where('sellerProductId', product.id)
    const byColour = Object.fromEntries(listings.map((l) => [l.color, l.published]))
    assert.deepEqual(byColour, { Black: true, White: false })
  })

  test('an order line carrying a coloured, resized SKU becomes that colour and size', async ({
    assert,
  }) => {
    const { product, sellerUser, stores, connection } = await shopWithVase()
    await stores.publish(sellerUser, connection.id, product.id, [
      { material: 'PETG', color: 'Black', scalePercent: 150, priceMinor: 45_000 },
    ])
    // a line from a variant we have not read back yet: only its SKU tells us what it is
    await stores.importOrder(connection, {
      externalOrderId: 'shop-77',
      name: '#77',
      lines: [
        {
          variantId: 'not-synced-yet',
          sku: fabrmatchSku(product.id, 'PETG', 'Black', 150),
          title: 'Vase',
          quantity: 2,
        },
      ],
      shippingAddress: TR_ADDRESS,
    })
    const external = await ExternalOrder.findByOrFail('externalOrderId', 'shop-77')
    assert.equal(external.status, 'placed')
    const item = await OrderItem.findByOrFail('orderId', external.orderId!)
    assert.equal(item.material, 'PETG')
    assert.equal(item.color, 'Black')
    assert.equal(item.scalePercent, 150)
    assert.equal(item.quantity, 2)
  })
})
