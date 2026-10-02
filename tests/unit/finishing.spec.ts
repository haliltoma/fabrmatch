/* eslint-disable @unicorn/no-await-expression-member -- terse assertions read better inline */
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import fabrmatchConfig from '#config/fabrmatch'
import FinishingOption from '#models/finishing_option'
import OrderItem from '#models/order_item'
import FinishingService, { FinishingError } from '#services/catalog/finishing_service'
import EligibilityService from '#services/matching/eligibility_service'
import CartService from '#services/orders/cart_service'
import { priceOrder } from '#services/orders/order_pricing'
import {
  createAnalyzedFile,
  createDraftOrder,
  createManufacturer,
  createPrinter,
  createUser,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'
import { uid } from '#tests/helpers/ids'

const service = new FinishingService()

test.group('finishing options', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('no choice is fine; unknown, switched-off and unsuitable choices are refused', async ({
    assert,
  }) => {
    assert.isNull(await service.resolve(null, 'PLA'))
    assert.isNull(await service.resolve('', 'PLA'))
    assert.equal((await service.resolve('sand', 'PLA'))?.code, 'SAND')
    await assert.rejects(() => service.resolve('NOPE', 'PLA'), FinishingError)

    await assert.rejects(() => service.resolve('VAPOR', 'PLA'), /not available for PLA/)
    assert.equal((await service.resolve('VAPOR', 'abs'))?.code, 'VAPOR')

    const sand = await FinishingOption.findByOrFail('code', 'SAND')
    await service.update(sand.id, { isActive: false }, (await createUser('admin')).id)
    await assert.rejects(() => service.resolve('SAND', 'PLA'), FinishingError)
  })

  test('admin adds options with validation; the price must be sane', async ({ assert }) => {
    const admin = await createUser('admin')
    const created = await service.create(
      { code: 'gloss', name: 'Gloss coat', priceMinor: 4000, materials: ['pla', 'petg'] },
      admin.id
    )
    assert.equal(created.code, 'GLOSS')
    assert.deepEqual(created.materials, ['PLA', 'PETG'])
    await assert.rejects(
      () => service.create({ code: 'GLOSS', name: 'x', priceMinor: 1 }, admin.id),
      /already exists/
    )
    await assert.rejects(() => service.create({ code: 'a b', name: 'x', priceMinor: 1 }, admin.id))
    await assert.rejects(() => service.create({ code: 'NEG', name: 'x', priceMinor: -1 }, admin.id))
    await assert.rejects(() => service.update(created.id, { priceMinor: 1.5 }, admin.id))
  })

  test('a maker offers only what they declare; switched-off options cannot be picked', async ({
    assert,
  }) => {
    const { profile } = await createManufacturer()
    const all = await service.list({ activeOnly: true })
    const [sand, prime] = all
    await service.setOffered(profile.id, [sand.id, prime.id, uid(999999)])
    assert.sameMembers(await service.offeredBy(profile.id), [sand.id, prime.id])
    await service.setOffered(profile.id, [sand.id])
    assert.deepEqual(await service.offeredBy(profile.id), [sand.id])
    await service.setOffered(profile.id, [])
    assert.deepEqual(await service.offeredBy(profile.id), [])
  })
})

test.group('finishing in prices and orders', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('the price goes into the maker’s share, and the platform fee and seller margin follow', async ({
    assert,
  }) => {
    const owner = await createUser('buyer')
    const file = await createAnalyzedFile(owner, 20_000)
    const base = { country: 'TR', hasSeller: true, sellerMarginBps: 2000 }
    const plain = await priceOrder({ ...base, items: [{ file, material: 'PLA', quantity: 2 }] })
    const sanded = await priceOrder({
      ...base,
      items: [{ file, material: 'PLA', quantity: 2, finishing: 'SAND' }],
    })
    const sand = await FinishingOption.findByOrFail('code', 'SAND')

    const [a, b] = [plain.items[0], sanded.items[0]]
    assert.equal(b.finishingCode, 'SAND')
    assert.equal(b.finishingName, sand.name)
    assert.equal(b.finishingMinor, sand.priceMinor)
    assert.equal(b.manufacturerShareMinor, a.manufacturerShareMinor + sand.priceMinor)
    assert.isAbove(b.platformCommissionMinor, a.platformCommissionMinor)
    assert.isAbove(b.unitCostMinor, a.unitCostMinor + sand.priceMinor - 1)
    assert.equal(
      b.unitCostMinor,
      b.manufacturerShareMinor +
        b.shippingMinor / b.quantity +
        b.platformCommissionMinor / b.quantity +
        b.sellerMarginMinor / b.quantity
    )
    assert.isAbove(sanded.totalMinor, plain.totalMinor)
    assert.isNull(a.finishingCode)
    assert.equal(a.finishingMinor, 0)
  })

  test('an order keeps the price and name it was priced with, even after the option changes', async ({
    assert,
  }) => {
    const { order } = await createDraftOrder(undefined, { finishing: 'PRIME', quantity: 2 })
    const item = await OrderItem.query().where('orderId', order.id).firstOrFail()
    const prime = await FinishingOption.findByOrFail('code', 'PRIME')
    assert.equal(item.finishingCode, 'PRIME')
    assert.equal(item.finishingName, prime.name)
    assert.equal(item.finishingMinor, prime.priceMinor)

    prime.priceMinor = 99_999
    prime.name = 'Renamed'
    await prime.save()
    const again = await OrderItem.findOrFail(item.id)
    assert.equal(again.finishingMinor, item.finishingMinor)
    assert.equal(again.finishingName, item.finishingName)
  })

  test('an unsuitable finishing stops the order before anything is created', async ({ assert }) => {
    await assert.rejects(() => createDraftOrder(undefined, { finishing: 'VAPOR' }), /not available/)
  })

  test('the same part with and without finishing are separate cart lines, priced apart', async ({
    assert,
  }) => {
    const user = await createUser('cart')
    const file = await createAnalyzedFile(user, 9000)
    const cart = new CartService()
    await cart.add(user, { modelFileId: file.id, material: 'PLA', quantity: 1 })
    await cart.add(user, { modelFileId: file.id, material: 'PLA', quantity: 1, finishing: 'sand' })
    await cart.add(user, { modelFileId: file.id, material: 'PLA', quantity: 2, finishing: 'SAND' })

    const preview = await cart.preview(user)
    assert.lengthOf(preview.lines, 2)
    const [plain, sanded] = preview.lines
    assert.isNull(plain.finishing)
    assert.equal(sanded.finishing, 'SAND')
    assert.equal(sanded.quantity, 3)
    assert.isAbove(sanded.unitPriceMinor!, plain.unitPriceMinor!)

    const order = await cart.checkout(user, {
      fullName: 'Ali Veli',
      line1: 'Test Sk. No:1',
      city: 'Istanbul',
      postalCode: '34000',
      country: 'TR',
    })
    const items = await OrderItem.query().where('orderId', order.id).orderBy('id')
    assert.sameMembers(
      items.map((i) => i.finishingCode),
      [null, 'SAND']
    )
  })

  test('the finishing price stays right in another currency', async ({ assert }) => {
    const flags = fabrmatchConfig.flags as Record<string, number>
    flags.currencyUsd = 1
    try {
      const { default: FxService } = await import('#services/pricing/fx_service')
      const { StaticFxProvider } = await import('#services/pricing/fx_provider')
      await new FxService().refresh(new StaticFxProvider())
      const owner = await createUser('buyer')
      const file = await createAnalyzedFile(owner, 20_000)
      const priced = await priceOrder({
        country: 'TR',
        hasSeller: false,
        currency: 'USD',
        items: [{ file, material: 'PLA', quantity: 2, finishing: 'PAINT', finishingColour: 'Red' }],
      })
      const item = priced.items[0]
      assert.isAbove(item.finishingMinor, 0)
      assert.isAtMost(item.finishingMinor, item.manufacturerShareMinor)
      assert.equal(
        item.unitCostMinor,
        item.manufacturerShareMinor +
          item.shippingMinor / item.quantity +
          item.platformCommissionMinor / item.quantity +
          item.sellerMarginMinor / item.quantity +
          // Paket V (V4): the FX buffer and round-up sit beside the parts
          item.fxGainMinor / item.quantity
      )
    } finally {
      flags.currencyUsd = 0
    }
  })
})

test.group('matching and finishing', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('an order that asks for a finishing only reaches makers who offer it', async ({
    assert,
  }) => {
    const offering = await createManufacturer()
    const plainMaker = await createManufacturer()
    await createPrinter(offering.profile)
    await createPrinter(plainMaker.profile)
    const sand = await FinishingOption.findByOrFail('code', 'SAND')
    await service.setOffered(offering.profile.id, [sand.id])

    const { order: withSand } = await createDraftOrder(undefined, { finishing: 'SAND' })
    const { order: plain } = await createDraftOrder()
    const matcher = new EligibilityService()

    const forSand = await matcher.findCandidates(withSand)
    assert.deepEqual(
      forSand.map((c) => c.manufacturerProfileId),
      [offering.profile.id]
    )
    const forPlain = await matcher.findCandidates(plain)
    assert.sameMembers(
      forPlain.map((c) => c.manufacturerProfileId),
      [offering.profile.id, plainMaker.profile.id]
    )

    await service.setOffered(offering.profile.id, [])
    assert.lengthOf(await matcher.findCandidates(withSand), 0)
  })
})
