import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import OrderItem from '#models/order_item'
import CatalogService, { normaliseScales } from '#services/catalog/catalog_service'
import EligibilityService from '#services/matching/eligibility_service'
import OrderService, { OrderInputError } from '#services/orders/order_service'
import StorefrontService from '#services/storefront/storefront_service'
import {
  TR_ADDRESS,
  createDraftOrder,
  createManufacturer,
  createPrinter,
  createStorefrontProduct,
  createUser,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'

test.group('size variants (R4-T9)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('scales always include 100, are sorted and unique', ({ assert }) => {
    assert.deepEqual(normaliseScales(undefined), [100])
    assert.deepEqual(normaliseScales([150, 50, 150, 5, 999]), [50, 100, 150])
  })

  test('volume, weight and price follow the cube of the scale', async ({ assert }) => {
    const buyer = await createUser('buyer')
    const base = await createDraftOrder(buyer)
    const big = await createDraftOrder(buyer, { scalePercent: 200 } as never)
    const small = await createDraftOrder(buyer, { scalePercent: 50 } as never)
    const item = async (id: string) => OrderItem.query().where('orderId', id).firstOrFail()
    const [b, l, s] = [
      await item(base.order.id),
      await item(big.order.id),
      await item(small.order.id),
    ]
    assert.equal(l.scalePercent, 200)
    assert.isAbove(l.estGrams, b.estGrams * 6, 'doubling each side is ~8x the material')
    assert.isAtMost(s.estGrams, b.estGrams)
    assert.isAbove(big.order.totalMinor, base.order.totalMinor)
    assert.isBelow(small.order.totalMinor, base.order.totalMinor)
  })

  test('a scaled part must still fit the printer', async ({ assert }) => {
    const maker = await createManufacturer()
    await createPrinter(maker.profile, { build: [55, 55, 55] }) // fixture parts are 20 mm cubes
    const fits = await createDraftOrder(undefined, { scalePercent: 250 } as never)
    const tooBig = await createDraftOrder(undefined, { scalePercent: 300 } as never)
    const eligibility = new EligibilityService()
    assert.lengthOf(await eligibility.findCandidates(fits.order), 1)
    assert.lengthOf(await eligibility.findCandidates(tooBig.order), 0)
  })

  test('out-of-range scales are refused', async ({ assert }) => {
    await assert.rejects(
      () => createDraftOrder(undefined, { scalePercent: 5 } as never),
      /between 10% and 300%/
    )
    await assert.rejects(
      () => createDraftOrder(undefined, { scalePercent: 301 } as never),
      OrderInputError as never
    )
  })

  test('the shop offers only the scales the catalog allows, priced per size', async ({
    assert,
  }) => {
    const { product, catalog } = await createStorefrontProduct()
    await new CatalogService().update(catalog, { allowedScales: [50, 150] })
    const detail = await new StorefrontService().find(product.id)
    assert.deepEqual(detail?.scales, [50, 100, 150])
    const price = (scale: number) =>
      detail!.options.find((o) => o.material === 'PLA' && o.scalePercent === scale)!.unitPriceMinor
    assert.isBelow(price(50), price(100))
    assert.isAbove(price(150), price(100))

    const buyer = await createUser('buyer')
    const orders = new OrderService()
    const ok = await orders.createStorefrontDraft(buyer, product.id, {
      material: 'PLA',
      quantity: 1,
      scalePercent: 150,
      shippingAddress: TR_ADDRESS,
    })
    const line = await OrderItem.query().where('orderId', ok.id).firstOrFail()
    assert.equal(line.scalePercent, 150)
    await assert.rejects(
      () =>
        orders.createStorefrontDraft(buyer, product.id, {
          material: 'PLA',
          quantity: 1,
          scalePercent: 120,
          shippingAddress: TR_ADDRESS,
        }),
      /not offered/
    )
  })
})

test.group('seller maker-level preference (R4-T11)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('the preference raises the required tier; only matching makers are offered the order', async ({
    assert,
  }) => {
    const { product } = await createStorefrontProduct()
    await import('#models/seller_product').then((m) =>
      m.default.query().where('id', product.id).update({ min_maker_tier: 2 })
    )
    const buyer = await createUser('buyer')
    const order = await new OrderService().createStorefrontDraft(buyer, product.id, {
      material: 'PLA',
      quantity: 1,
      shippingAddress: TR_ADDRESS,
    })
    assert.equal(order.requiredTrustTier, 2)

    const rookie = await createManufacturer({ trustTier: 0 })
    const trusted = await createManufacturer({ trustTier: 2 })
    await createPrinter(rookie.profile)
    await createPrinter(trusted.profile)
    const candidates = await new EligibilityService().findCandidates(order)
    assert.deepEqual(
      candidates.map((c) => c.manufacturerProfileId),
      [trusted.profile.id]
    )
  })

  test('without a preference the value-based tier still applies (never lower)', async ({
    assert,
  }) => {
    const { product } = await createStorefrontProduct()
    const buyer = await createUser('buyer')
    const order = await new OrderService().createStorefrontDraft(buyer, product.id, {
      material: 'PLA',
      quantity: 1,
      shippingAddress: TR_ADDRESS,
    })
    assert.equal(order.requiredTrustTier, 0)
  })
})
