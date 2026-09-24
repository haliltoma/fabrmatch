import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import CartItem from '#models/cart_item'
import Order from '#models/order'
import OrderItem from '#models/order_item'
import PrintProfile from '#models/print_profile'
import CartService, { CartError } from '#services/orders/cart_service'
import EligibilityService from '#services/matching/eligibility_service'
import OrderService, { OrderInputError } from '#services/orders/order_service'
import { priceOrder } from '#services/orders/order_pricing'
import {
  TR_ADDRESS,
  createAnalyzedFile,
  createManufacturer,
  createPrinter,
  createUser,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'

const cart = new CartService()

test.group('multi-item orders', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('one order holds several lines; totals and splits add up exactly', async ({ assert }) => {
    const buyer = await createUser('buyer')
    const a = await createAnalyzedFile(buyer, 8000)
    const b = await createAnalyzedFile(buyer, 30000)
    const order = await new OrderService().createDraftForItems(buyer, {
      items: [
        { modelFileId: a.id, material: 'PLA', quantity: 3 },
        { modelFileId: b.id, material: 'PETG', quantity: 1 },
      ],
      shippingAddress: TR_ADDRESS,
    })
    const items = await OrderItem.query().where('orderId', order.id).orderBy('id')
    assert.lengthOf(items, 2)

    const lineTotal = items.reduce((sum, i) => sum + i.unitCostMinor * i.quantity, 0)
    assert.equal(order.totalMinor, lineTotal)
    assert.equal(order.totalMinor, order.subtotalMinor + order.shippingMinor)
    assert.isAbove(order.shippingMinor, 0)
    // the maker is paid its share plus shipping, so fee + seller share can never exceed the total
    const makerShare = items.reduce((sum, i) => sum + i.manufacturerShareMinor * i.quantity, 0)
    assert.isAtLeast(order.totalMinor - order.platformFeeMinor - order.sellerShareMinor, makerShare)
  })

  test('two parts ship in one parcel: cheaper than two separate orders', async ({ assert }) => {
    const buyer = await createUser('buyer')
    const a = await createAnalyzedFile(buyer, 8000)
    const b = await createAnalyzedFile(buyer, 8000)
    const service = new OrderService()
    const together = await service.createDraftForItems(buyer, {
      items: [
        { modelFileId: a.id, material: 'PLA', quantity: 1 },
        { modelFileId: b.id, material: 'PLA', quantity: 1 },
      ],
      shippingAddress: TR_ADDRESS,
    })
    const one = await service.createDraft(buyer, {
      modelFileId: a.id,
      material: 'PLA',
      quantity: 1,
      shippingAddress: TR_ADDRESS,
    })
    assert.isBelow(together.shippingMinor, one.shippingMinor * 2)
  })

  test('mixed technologies, foreign files and empty orders are refused', async ({ assert }) => {
    const buyer = await createUser('buyer')
    const other = await createUser('other')
    const mine = await createAnalyzedFile(buyer)
    const theirs = await createAnalyzedFile(other)
    const sla = await PrintProfile.findByOrFail('code', 'SLA_STANDARD')
    const service = new OrderService()

    await assert.rejects(
      () =>
        service.createDraftForItems(buyer, {
          items: [
            { modelFileId: mine.id, material: 'PLA', quantity: 1 },
            { modelFileId: mine.id, material: 'RESIN', quantity: 1, printProfileId: sla.id },
          ],
          shippingAddress: TR_ADDRESS,
        }),
      /one technology/
    )
    await assert.rejects(
      () =>
        service.createDraftForItems(buyer, {
          items: [{ modelFileId: theirs.id, material: 'PLA', quantity: 1 }],
          shippingAddress: TR_ADDRESS,
        }),
      OrderInputError as never
    )
    await assert.rejects(
      () => service.createDraftForItems(buyer, { items: [], shippingAddress: TR_ADDRESS }),
      /no items/
    )
  })

  test('matching looks at the whole order: total minutes and every part must fit', async ({
    assert,
  }) => {
    const buyer = await createUser('buyer')
    const a = await createAnalyzedFile(buyer, 8000)
    const b = await createAnalyzedFile(buyer, 8000)
    const order = await new OrderService().createDraftForItems(buyer, {
      items: [
        { modelFileId: a.id, material: 'PLA', quantity: 1 },
        { modelFileId: b.id, material: 'PLA', quantity: 1 },
      ],
      shippingAddress: TR_ADDRESS,
    })
    const fresh = await Order.findOrFail(order.id)
    const items = await OrderItem.query().where('orderId', order.id)
    const minutes = items.reduce((s, i) => s + i.estPrintMinutes, 0)

    const roomy = await createManufacturer()
    const tight = await createManufacturer()
    await createPrinter(roomy.profile, { slotMinutes: minutes })
    await createPrinter(tight.profile, { slotMinutes: minutes - 1 })
    const candidates = await new EligibilityService().findCandidates(fresh)
    assert.deepEqual(
      candidates.map((c) => c.manufacturerProfileId),
      [roomy.profile.id]
    )
  })

  test('a cart preview and the real order agree to the minor unit', async ({ assert }) => {
    const buyer = await createUser('buyer')
    const a = await createAnalyzedFile(buyer, 12000)
    const b = await createAnalyzedFile(buyer, 5000)
    await cart.add(buyer, { modelFileId: a.id, material: 'pla', quantity: 2 })
    await cart.add(buyer, { modelFileId: b.id, material: 'PETG', quantity: 4 })

    const preview = await cart.preview(buyer, 'TR')
    assert.isNull(preview.problem)
    const order = await cart.checkout(buyer, TR_ADDRESS)
    assert.equal(order.totalMinor, preview.totals!.totalMinor)
    assert.equal(order.shippingMinor, preview.totals!.shippingMinor)
    assert.equal(await cart.count(buyer.id), 0, 'checkout empties the cart')
  })

  test('priceOrder never charges less than the parcel costs (random lines)', async ({ assert }) => {
    const buyer = await createUser('buyer')
    for (let round = 0; round < 8; round++) {
      const lines = []
      for (let i = 0; i < 1 + (round % 3); i++) {
        lines.push({
          file: await createAnalyzedFile(buyer, 2000 + round * 4321 + i * 777),
          material: 'PLA',
          quantity: 1 + ((round * 7 + i * 3) % 9),
        })
      }
      const priced = await priceOrder({ items: lines, country: 'TR', hasSeller: false })
      assert.equal(priced.totalMinor, priced.subtotalMinor + priced.shippingMinor)
      assert.isAtLeast(
        priced.totalMinor - priced.platformFeeMinor - priced.sellerShareMinor,
        priced.items.reduce((s, i) => s + i.manufacturerShareMinor * i.quantity, 0)
      )
    }
  })
})

test.group('CartService', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('the same choice merges quantities; a different one is a new line', async ({ assert }) => {
    const buyer = await createUser('buyer')
    const file = await createAnalyzedFile(buyer)
    await cart.add(buyer, { modelFileId: file.id, material: 'PLA', quantity: 2 })
    await cart.add(buyer, { modelFileId: file.id, material: 'pla', quantity: 3 })
    await cart.add(buyer, { modelFileId: file.id, material: 'PETG', quantity: 1 })
    const rows = await CartItem.query().where('userId', buyer.id).orderBy('id')
    assert.deepEqual(
      rows.map((r) => [r.material, r.quantity]),
      [
        ['PLA', 5],
        ['PETG', 1],
      ]
    )
    assert.equal(await cart.count(buyer.id), 6)
  })

  test('carts are private and validated', async ({ assert }) => {
    const buyer = await createUser('buyer')
    const other = await createUser('other')
    const mine = await createAnalyzedFile(buyer)
    const theirs = await createAnalyzedFile(other)

    await assert.rejects(
      () => cart.add(buyer, { modelFileId: theirs.id, material: 'PLA', quantity: 1 }),
      CartError
    )
    await assert.rejects(
      () => cart.add(buyer, { modelFileId: mine.id, material: 'PLA', quantity: 0 }),
      CartError
    )
    const line = await cart.add(buyer, { modelFileId: mine.id, material: 'PLA', quantity: 1 })
    await assert.rejects(() => cart.setQuantity(other, line.id, 5), /not found/)
    await cart.remove(other, line.id)
    assert.equal(await cart.count(buyer.id), 1, 'someone else cannot remove it')
    await cart.setQuantity(buyer, line.id, 7)
    assert.equal(await cart.count(buyer.id), 7)
    await assert.rejects(() => cart.checkout(other, TR_ADDRESS), /empty/)
  })

  test('a mixed-technology cart explains itself instead of failing', async ({ assert }) => {
    const buyer = await createUser('buyer')
    const file = await createAnalyzedFile(buyer)
    const sla = await PrintProfile.findByOrFail('code', 'SLA_STANDARD')
    await cart.add(buyer, { modelFileId: file.id, material: 'PLA', quantity: 1 })
    await cart.add(buyer, {
      modelFileId: file.id,
      material: 'RESIN',
      quantity: 1,
      printProfileId: sla.id,
    })
    const preview = await cart.preview(buyer)
    assert.isNull(preview.totals)
    assert.match(preview.problem!, /one technology/)
  })

  test('the cart is capped', async ({ assert }) => {
    const buyer = await createUser('buyer')
    const file = await createAnalyzedFile(buyer)
    const materials = ['PLA', 'PETG', 'ABS', 'TPU', 'NYLON', 'RESIN']
    let added = 0
    for (const material of materials) {
      for (const color of ['a', 'b', 'c', 'd']) {
        if (added >= 20) break
        await cart.add(buyer, { modelFileId: file.id, material, color, quantity: 1 })
        added++
      }
    }
    await assert.rejects(
      () => cart.add(buyer, { modelFileId: file.id, material: 'PLA', color: 'zzz', quantity: 1 }),
      /at most 20/
    )
  })
})

import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import EtaService from '#services/orders/eta_service'

test.group('EtaService', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('no maker with room means no promise', async ({ assert }) => {
    assert.isNull(
      await new EtaService().estimate({ technology: 'FDM', printMinutes: 60, country: 'TR' })
    )
  })

  test('the window starts at the first slot that fits and widens with distance', async ({
    assert,
  }) => {
    const maker = await createManufacturer()
    const nearDate = DateTime.now().plus({ days: 3 }).toISODate()!
    await createPrinter(maker.profile, { slotDate: nearDate, slotMinutes: 300 })
    const later = await createManufacturer()
    await createPrinter(later.profile, {
      slotDate: DateTime.now().plus({ days: 10 }).toISODate()!,
      slotMinutes: 900,
    })
    await db
      .from('shipping_zones')
      .where('code', 'TR')
      .update({ transit_days_min: 1, transit_days_max: 3 })
    await db
      .from('shipping_zones')
      .where('code', 'WORLD')
      .update({ transit_days_min: 7, transit_days_max: 14 })
    const eta = new EtaService()

    const small = await eta.estimate({ technology: 'FDM', printMinutes: 200, country: 'TR' })
    assert.equal(small!.earliest, DateTime.fromISO(nearDate).plus({ days: 2 }).toISODate())
    assert.equal(
      small!.latest,
      DateTime.fromISO(nearDate)
        .plus({ days: 5 + 3 })
        .toISODate()
    )

    const big = await eta.estimate({ technology: 'FDM', printMinutes: 600, country: 'TR' })
    assert.isTrue(big!.earliest > small!.earliest, 'a long job waits for a roomier slot')

    const abroad = await eta.estimate({ technology: 'FDM', printMinutes: 200, country: 'JP' })
    assert.isTrue(abroad!.latest > small!.latest)

    assert.isNull(await eta.estimate({ technology: 'SLA', printMinutes: 10, country: 'TR' }))
  })
})
