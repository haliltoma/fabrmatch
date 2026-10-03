import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import EligibilityService, { fitsBuildVolume } from '#services/matching/eligibility_service'
import ManufacturerProfile from '#models/manufacturer_profile'
import ModelFile from '#models/model_file'
import OrderItem from '#models/order_item'
import {
  createDraftOrder,
  createManufacturer,
  createPrinter,
  idsOf,
} from '#tests/helpers/order_fixtures'

test.group('fitsBuildVolume', () => {
  test('allows rotation, rejects oversize', ({ assert }) => {
    assert.isTrue(fitsBuildVolume([300, 10, 10], [100, 100, 310]))
    assert.isTrue(fitsBuildVolume([200, 200, 200], [200, 200, 200]))
    assert.isTrue(fitsBuildVolume([150, 150, 10], [100, 200, 300]))
    assert.isFalse(fitsBuildVolume([150, 150, 150], [100, 200, 300]))
  })
})

test.group('EligibilityService', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  const svc = new EligibilityService()

  test('eligible manufacturer is returned with slot and same-city flag', async ({ assert }) => {
    const { profile } = await createManufacturer({ city: 'İstanbul' })
    const printer = await createPrinter(profile)
    const { order } = await createDraftOrder()

    const candidates = await svc.findCandidates(order, { buyerCity: 'istanbul' })

    assert.lengthOf(candidates, 1)
    assert.equal(candidates[0].manufacturerProfileId, profile.id)
    assert.equal(candidates[0].printerId, printer.id)
    assert.isTrue(candidates[0].sameCity)
    assert.equal(candidates[0].completedJobs, 0)
  })

  test('inactive printer is invisible to matching', async ({ assert }) => {
    const { profile } = await createManufacturer()
    await createPrinter(profile, { isActive: false })
    const { order } = await createDraftOrder()

    assert.lengthOf(await svc.findCandidates(order), 0)
  })

  test('buyer cannot be matched to their own manufacturer profile', async ({ assert }) => {
    const { user, profile } = await createManufacturer()
    await createPrinter(profile)
    const { order } = await createDraftOrder(user)

    assert.lengthOf(await svc.findCandidates(order), 0)
  })

  test('seller cannot be matched to their own manufacturer profile', async ({ assert }) => {
    const { user, profile } = await createManufacturer()
    await createPrinter(profile)
    const { order } = await createDraftOrder(undefined, { sellerId: user.id })

    assert.lengthOf(await svc.findCandidates(order), 0)
  })

  test('material must match; the colour is the maker’s call on the offer', async ({ assert }) => {
    const { profile: petg } = await createManufacturer()
    await createPrinter(petg, { material: 'PETG' })
    const { profile: red } = await createManufacturer()
    await createPrinter(red, { colors: ['red'] })
    const { profile: ok } = await createManufacturer()
    await createPrinter(ok, { colors: ['Black'] })

    const { order } = await createDraftOrder(undefined, { color: 'black' })
    const ids = idsOf(await svc.findCandidates(order))

    assert.sameMembers(ids, [ok.id, red.id])
  })

  test('technology must match', async ({ assert }) => {
    const { profile } = await createManufacturer()
    await createPrinter(profile, { technology: 'SLA' })
    const { order } = await createDraftOrder()

    assert.lengthOf(await svc.findCandidates(order), 0)
  })

  test('part must fit build volume (with rotation)', async ({ assert }) => {
    const { profile: small } = await createManufacturer()
    await createPrinter(small, { build: [100, 100, 100] })
    const { profile: tall } = await createManufacturer()
    await createPrinter(tall, { build: [100, 100, 310] })

    const { order, file } = await createDraftOrder()
    await ModelFile.query().where('id', file.id).update({
      bbox_x_mm: 300,
      bbox_y_mm: 10,
      bbox_z_mm: 10,
    })

    const ids = idsOf(await svc.findCandidates(order))
    assert.deepEqual(ids, [tall.id])
  })

  test('requires a capacity slot with enough free minutes inside the SLA window', async ({
    assert,
  }) => {
    const { profile: tiny } = await createManufacturer()
    await createPrinter(tiny, { slotMinutes: 5 })
    const { profile: far } = await createManufacturer()
    await createPrinter(far, { slotDate: DateTime.now().plus({ days: 30 }).toISODate()! })
    const { profile: none } = await createManufacturer()
    await createPrinter(none, { slotMinutes: 0 })
    const { profile: ok } = await createManufacturer()
    await createPrinter(ok)

    const { order } = await createDraftOrder()
    await order.load('items')
    assert.isAbove(order.items[0].estPrintMinutes, 5)

    const ids = idsOf(await svc.findCandidates(order))
    assert.deepEqual(ids, [ok.id])
  })

  test('trust tier, country and profile status are hard constraints', async ({ assert }) => {
    const { profile: lowTier } = await createManufacturer({ trustTier: 0 })
    await createPrinter(lowTier)
    const { profile: foreign } = await createManufacturer({ trustTier: 2, country: 'DE' })
    await createPrinter(foreign)
    const { profile: suspended } = await createManufacturer({ trustTier: 2 })
    await createPrinter(suspended)
    await ManufacturerProfile.query().where('id', suspended.id).update({ status: 'suspended' })
    const { profile: ok } = await createManufacturer({ trustTier: 2 })
    await createPrinter(ok)

    const { order } = await createDraftOrder()
    order.requiredTrustTier = 1
    await order.save()

    const ids = idsOf(await svc.findCandidates(order))
    assert.deepEqual(ids, [ok.id])
  })

  test('excluded manufacturers (previous rounds) are skipped', async ({ assert }) => {
    const { profile: a } = await createManufacturer()
    await createPrinter(a)
    const { profile: b } = await createManufacturer()
    await createPrinter(b)
    const { order } = await createDraftOrder()

    const ids = idsOf(await svc.findCandidates(order, { excludeManufacturerIds: [a.id] }))
    assert.deepEqual(ids, [b.id])
  })

  test('one candidate per manufacturer, earliest slot wins', async ({ assert }) => {
    const { profile } = await createManufacturer()
    await createPrinter(profile, { slotDate: DateTime.now().plus({ days: 3 }).toISODate()! })
    const early = await createPrinter(profile, {
      slotDate: DateTime.now().plus({ days: 1 }).toISODate()!,
    })
    const { order } = await createDraftOrder()

    const candidates = await svc.findCandidates(order)
    assert.lengthOf(candidates, 1)
    assert.equal(candidates[0].printerId, early.id)
  })

  test('mixed-technology orders are not matched in v1', async ({ assert }) => {
    const { profile } = await createManufacturer()
    await createPrinter(profile)
    const { order, file } = await createDraftOrder()
    await OrderItem.create({
      orderId: order.id,
      modelFileId: file.id,
      technology: 'SLA',
      material: 'RESIN',
      quantity: 1,
      estGrams: 5,
      estPrintMinutes: 10,
      unitCostMinor: 1000,
      manufacturerShareMinor: 500,
    })

    assert.lengthOf(await svc.findCandidates(order), 0)
  })
})
