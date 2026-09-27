/* eslint-disable @unicorn/no-await-expression-member -- terse assertions read better inline */
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import PricingRegion from '#models/pricing_region'
import PricingRegionMaterial from '#models/pricing_region_material'
import { priceOrder, OrderInputError } from '#services/orders/order_pricing'
import PricingRegionService, {
  regionalReferenceMinor,
  roundUnitMinor,
} from '#services/pricing/pricing_region_service'
import { referencePriceFor } from '#services/pricing/reference_prices'
import EligibilityService from '#services/matching/eligibility_service'
import PrinterMaterial from '#models/printer_material'
import {
  createAnalyzedFile,
  createDraftOrder,
  createManufacturer,
  createPrinter,
  createUser,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'

test.group('regional pricing: pure rules (P2)', () => {
  test('rounding only ever goes up, and lands where the rule says', ({ assert }) => {
    assert.equal(roundUnitMinor(1234, 'none'), 1234)
    assert.equal(roundUnitMinor(1234, 'whole'), 1300)
    assert.equal(roundUnitMinor(1200, 'whole'), 1200)
    assert.equal(roundUnitMinor(1234, 'charm99'), 1299)
    assert.equal(roundUnitMinor(1299, 'charm99'), 1299)
    assert.equal(roundUnitMinor(1200, 'charm99'), 1299)
    for (const minor of [1, 99, 100, 101, 4_567, 99_999]) {
      for (const rule of ['none', 'whole', 'charm99'] as const) {
        assert.isAtLeast(roundUnitMinor(minor, rule), minor, `${rule} ${minor}`)
      }
    }
  })

  test('a region reference is its own override, else the base scaled up', ({ assert }) => {
    assert.equal(regionalReferenceMinor(50, 10_000, null), 50)
    assert.equal(regionalReferenceMinor(50, 12_000, null), 60)
    assert.equal(regionalReferenceMinor(55, 11_000, null), 61) // 60.5 → up
    assert.equal(regionalReferenceMinor(50, 12_000, 70), 70)
  })
})

test.group('regional pricing: regions and orders (P2)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('seeded regions cover TR, the EU, the UK and the US; anything else is the rest of the world', async ({
    assert,
  }) => {
    const regions = new PricingRegionService()
    assert.equal((await regions.forCountry('TR')).code, 'TR')
    assert.equal((await regions.forCountry('de')).code, 'EU')
    assert.equal((await regions.forCountry('FR')).code, 'EU')
    assert.equal((await regions.forCountry('GB')).code, 'UK')
    assert.equal((await regions.forCountry('US')).code, 'US')
    assert.equal((await regions.forCountry('JP')).code, 'ROW')
    // seeded neutral: nobody's price changes until an admin sets region prices
    for (const r of await PricingRegion.all()) {
      assert.equal(r.referenceMultiplierBps, 10_000, r.code)
      assert.isNull(r.commissionBps, r.code)
      assert.equal(r.rounding, 'none', r.code)
      assert.equal(r.minOrderMinor, 0, r.code)
    }
  })

  test('a region with higher rates prices higher; TR is untouched and the order knows its region', async ({
    assert,
  }) => {
    const file = await createAnalyzedFile(await createUser('buyer'), 20_000)
    const order = (country: string) =>
      priceOrder({ country, hasSeller: false, items: [{ file, material: 'PLA', quantity: 1 }] })

    const trBefore = await order('TR')
    const euBefore = await order('DE')
    await PricingRegion.query().where('code', 'EU').update({ referenceMultiplierBps: 15_000 })
    const tr = await order('TR')
    const eu = await order('DE')

    assert.equal(tr.items[0].unitCostMinor, trBefore.items[0].unitCostMinor)
    assert.isAbove(eu.items[0].manufacturerShareMinor, euBefore.items[0].manufacturerShareMinor)
    assert.isAbove(eu.totalMinor, euBefore.totalMinor)
    const euRegion = await PricingRegion.findByOrFail('code', 'EU')
    const trRegion = await PricingRegion.findByOrFail('code', 'TR')
    assert.equal(eu.pricingRegionId, euRegion.id)
    assert.equal(tr.pricingRegionId, trRegion.id)
  })

  test('a per-material override beats the multiplier; the region commission replaces the global one', async ({
    assert,
  }) => {
    const file = await createAnalyzedFile(await createUser('buyer'), 20_000)
    const us = await PricingRegion.findByOrFail('code', 'US')
    const price = () =>
      priceOrder({
        country: 'US',
        hasSeller: false,
        items: [{ file, material: 'PETG', quantity: 1 }],
      })
    const before = await price()

    await PricingRegionMaterial.create({
      pricingRegionId: us.id,
      material: 'PETG',
      pricePerGramMinor: referencePriceFor('PETG')!.pricePerGramMinor * 2,
    })
    us.referenceMultiplierBps = 50_000 // ignored for PETG: the override wins
    us.commissionBps = 0
    await us.save()
    const after = await price()

    assert.isAbove(after.items[0].manufacturerShareMinor, before.items[0].manufacturerShareMinor)
    assert.isBelow(
      after.items[0].manufacturerShareMinor,
      before.items[0].manufacturerShareMinor * 5,
      'multiplier ignored'
    )
    assert.equal(after.items[0].platformCommissionMinor, 0)
  })

  test('rounding lifts the unit price and keeps every part adding up', async ({ assert }) => {
    const file = await createAnalyzedFile(await createUser('buyer'), 20_000)
    await PricingRegion.query().where('code', 'TR').update({ rounding: 'charm99' })
    const priced = await priceOrder({
      country: 'TR',
      hasSeller: true,
      sellerMarginBps: 2000,
      items: [{ file, material: 'PLA', quantity: 3 }],
    })
    const item = priced.items[0]
    assert.equal(item.unitCostMinor % 100, 99)
    const perUnit =
      item.manufacturerShareMinor +
      item.shippingMinor / item.quantity +
      item.platformCommissionMinor / item.quantity +
      item.sellerMarginMinor / item.quantity
    assert.equal(perUnit, item.unitCostMinor)
    assert.equal(priced.totalMinor, item.unitCostMinor * 3)
  })

  test('an order under the region minimum is refused with the amount', async ({ assert }) => {
    const file = await createAnalyzedFile(await createUser('buyer'), 20_000)
    await PricingRegion.query().where('code', 'UK').update({ minOrderMinor: 10_000_000 })
    await assert.rejects(
      () =>
        priceOrder({
          country: 'GB',
          hasSeller: false,
          items: [{ file, material: 'PLA', quantity: 1 }],
        }),
      OrderInputError
    )
    // other regions are not affected
    await priceOrder({
      country: 'TR',
      hasSeller: false,
      items: [{ file, material: 'PLA', quantity: 1 }],
    })
  })

  test('matching holds makers to their region reference, not the Turkish one', async ({
    assert,
  }) => {
    const base = referencePriceFor('PLA')!.pricePerGramMinor
    const { profile } = await createManufacturer({ country: 'DE', city: 'Berlin' })
    const printer = await createPrinter(profile, { material: 'PLA' })
    // dearer than the base reference, within an EU reference 50% higher
    await PrinterMaterial.query()
      .where('printerId', printer.id)
      .update({ pricePerGramMinor: base + Math.floor(base / 4) })
    const address = {
      fullName: 'Max Muster',
      line1: 'Hauptstr. 1',
      city: 'Berlin',
      postalCode: '10115',
      country: 'DE',
      phone: '+4930123456',
    }

    const neutral = await createDraftOrder(undefined, { shippingAddress: address })
    const before = await new EligibilityService().findCandidates(neutral.order)
    assert.notInclude(
      before.map((c) => c.printerId),
      printer.id
    )

    await PricingRegion.query().where('code', 'EU').update({ referenceMultiplierBps: 15_000 })
    const regional = await createDraftOrder(undefined, { shippingAddress: address })
    const after = await new EligibilityService().findCandidates(regional.order)
    assert.include(
      after.map((c) => c.printerId),
      printer.id
    )
  })
})
