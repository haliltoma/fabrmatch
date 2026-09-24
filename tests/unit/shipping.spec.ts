import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import AuditLog from '#models/audit_log'
import ShippingService, { ShippingError } from '#services/shipping/shipping_service'
import ShippingTable, { PACKAGING_GRAMS } from '#services/shipping/shipping_table'
import { createDraftOrder, createUser } from '#tests/helpers/order_fixtures'

const table = new ShippingTable([
  {
    code: 'TR',
    countries: ['TR'],
    isFallback: false,
    extraPerKgMinor: 1000,
    currency: 'TRY',
    transitDaysMin: 1,
    transitDaysMax: 3,
    tiers: [
      { upToGrams: 500, priceMinor: 4000 },
      { upToGrams: 2000, priceMinor: 6000 },
    ],
  },
  {
    code: 'WORLD',
    countries: [],
    isFallback: true,
    extraPerKgMinor: 5000,
    currency: 'TRY',
    transitDaysMin: 1,
    transitDaysMax: 3,
    tiers: [{ upToGrams: 1000, priceMinor: 30000 }],
  },
])

test.group('ShippingTable', () => {
  test('zones are found by country, case-insensitively, with a fallback', ({ assert }) => {
    assert.equal(table.zoneFor('tr').code, 'TR')
    assert.equal(table.zoneFor('JP').code, 'WORLD')
  })

  test('the tier follows chargeable grams and includes packaging', ({ assert }) => {
    const light = table.parcelMinor({ country: 'TR', gramsPerUnit: 100, quantity: 1 })
    assert.equal(light.chargeableGrams, 100 + PACKAGING_GRAMS)
    assert.equal(light.minor, 4000)

    const heavier = table.parcelMinor({ country: 'TR', gramsPerUnit: 500, quantity: 1 })
    assert.equal(heavier.minor, 6000, '560 g is past the 500 g tier')
  })

  test('volumetric weight wins for big light parts', ({ assert }) => {
    // 300 mm cube = 27 000 000 mm³ / 5000 = 5400 g chargeable
    const parcel = table.parcelMinor({
      country: 'TR',
      gramsPerUnit: 50,
      bboxMm: [300, 300, 300],
      quantity: 1,
    })
    assert.equal(parcel.chargeableGrams, 5400)
  })

  test('above the top tier every started kilogram is added', ({ assert }) => {
    // 2000 g top tier; 3001 g → 2 extra started kg
    const parcel = table.parcelMinor({
      country: 'TR',
      gramsPerUnit: 3001 - PACKAGING_GRAMS,
      quantity: 1,
    })
    assert.equal(parcel.chargeableGrams, 3001)
    assert.equal(parcel.minor, 6000 + 2 * 1000)
  })

  test('per-unit shipping rounds up so the parcel is always covered', ({ assert }) => {
    const input = { country: 'TR', gramsPerUnit: 100, quantity: 3 }
    const perUnit = table.perUnitMinor(input)
    const parcel = table.parcelMinor(input).minor
    assert.isAtLeast(perUnit * 3, parcel)
    assert.isBelow(perUnit * 3 - parcel, 3)
  })

  test('more parts cost more than one, abroad costs more than at home', ({ assert }) => {
    const one = table.parcelMinor({ country: 'TR', gramsPerUnit: 400, quantity: 1 }).minor
    const many = table.parcelMinor({ country: 'TR', gramsPerUnit: 400, quantity: 5 }).minor
    assert.isAbove(many, one)
    const abroad = table.parcelMinor({ country: 'DE', gramsPerUnit: 400, quantity: 1 }).minor
    assert.isAbove(abroad, one)
  })
})

test.group('ShippingService', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('the seeded table has a fallback and prices every zone', async ({ assert }) => {
    const seeded = await new ShippingService().table()
    assert.equal(seeded.zoneFor('TR').code, 'TR')
    assert.equal(seeded.zoneFor('DE').code, 'EU')
    assert.equal(seeded.zoneFor('BR').code, 'WORLD')
    const domestic = seeded.parcelMinor({ country: 'TR', gramsPerUnit: 100, quantity: 1 }).minor
    const world = seeded.parcelMinor({ country: 'BR', gramsPerUnit: 100, quantity: 1 }).minor
    assert.isAbove(world, domestic)
  })

  test('an admin can change a rate, audited; bad prices are refused', async ({ assert }) => {
    const admin = await createUser('admin')
    const service = new ShippingService()
    const [tr] = await service.listForAdmin()
    const first = tr.rates[0]

    await service.setRate(first.id, 4321, admin.id)
    const after = await service.table()
    assert.equal(after.parcelMinor({ country: 'TR', gramsPerUnit: 10, quantity: 1 }).minor, 4321)
    const audit = await AuditLog.query().where('action', 'shipping.rate_changed').firstOrFail()
    assert.deepInclude(audit.meta, { from: first.priceMinor, to: 4321 })

    await assert.rejects(() => service.setRate(first.id, -1, admin.id), ShippingError)
    await assert.rejects(() => service.setRate(first.id, 1.5, admin.id), ShippingError)
    await assert.rejects(() => service.setRate(999999, 100, admin.id), /not found/)
    await service.setExtraPerKg(tr.id, 2500, admin.id)
    const changed = await service.listForAdmin()
    assert.equal(changed[0].extraPerKgMinor, 2500)
  })
})

test.group('order shipping', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('shipping follows the destination and the totals stay consistent', async ({ assert }) => {
    const domestic = await createDraftOrder()
    const abroad = await createDraftOrder(undefined, {
      shippingAddress: {
        fullName: 'Hans',
        line1: 'Hauptstr. 1',
        city: 'Berlin',
        postalCode: '10115',
        country: 'DE',
        phone: '+491701234567',
      },
    })
    assert.isAbove(abroad.order.shippingMinor, domestic.order.shippingMinor)
    for (const { order } of [domestic, abroad]) {
      assert.equal(order.totalMinor, order.subtotalMinor + order.shippingMinor)
    }
  })
})
