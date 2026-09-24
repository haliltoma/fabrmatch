import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import drive from '@adonisjs/drive/services/main'
import ModelFile from '#models/model_file'
import OrderItem from '#models/order_item'
import PrintProfile from '#models/print_profile'
import SliceEstimate from '#models/slice_estimate'
import { slicedNumbers } from '#services/orders/order_pricing'
import FakeSlicer from '#services/slicing/fake_slicer'
import SliceEstimateService from '#services/slicing/slice_estimate_service'
import { parseGcodeStats } from '#services/slicing/slicer'
import {
  createAnalyzedFile,
  createDraftOrder,
  createUser,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'

test.group('G-code summary parsing', () => {
  test('reads Orca and Prusa style footers', ({ assert }) => {
    const orca = '; filament used [g] = 12.34\n; estimated printing time (normal mode) = 1h 2m 3s\n'
    assert.deepEqual(parseGcodeStats(orca), { grams: 12.34, printMinutes: 63 })
    const prusa = '; total filament used [g] = 5.5\n; estimated printing time = 2d 1h 0m 0s'
    assert.deepEqual(parseGcodeStats(prusa), { grams: 5.5, printMinutes: 2 * 1440 + 60 })
    assert.equal(
      parseGcodeStats('; filament used [g] = 1\n; estimated printing time = 20s').printMinutes,
      1
    )
  })

  test('a footer without the numbers is an error, not a zero', ({ assert }) => {
    assert.throws(() => parseGcodeStats('G1 X0 Y0\n'), /no filament or time summary/)
  })
})

test.group('SliceEstimateService (R2-T1)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())
  group.each.setup(() => {
    drive.fake('s3')
    return () => drive.restore('s3')
  })

  async function storedFile() {
    const owner = await createUser('owner')
    const file = await createAnalyzedFile(owner)
    await drive.use('s3').put(file.storageKey, 'solid x\nendsolid x\n')
    return file
  }

  test('slices once per model + profile, then answers from the cache', async ({ assert }) => {
    const file = await storedFile()
    const slicer = new FakeSlicer()
    const service = new SliceEstimateService(slicer)

    assert.equal(await service.ensure(file.id, 'FDM_STANDARD'), 'sliced')
    assert.equal(await service.ensure(file.id, 'FDM_STANDARD'), 'cached')
    assert.lengthOf(slicer.calls, 1)
    assert.equal(
      await service.ensure(file.id, 'FDM_FINE'),
      'sliced',
      'another profile is another slice'
    )
    assert.deepEqual(await service.cached(file.sha256, 'FDM_STANDARD'), {
      grams: 12.5,
      supportGrams: 1.25,
      printMinutes: 95,
    })

    // an identical upload (same bytes) by someone else reuses the result
    const twin = await createAnalyzedFile(await createUser('twin'))
    await ModelFile.query().where('id', twin.id).update({ sha256: file.sha256 })
    assert.equal(await service.ensure(twin.id, 'FDM_STANDARD'), 'cached')
  })

  test('a failing slicer is recorded and never blocks: cached() stays null', async ({ assert }) => {
    const file = await storedFile()
    const slicer = new FakeSlicer()
    slicer.failWith = 'profile is invalid'
    const service = new SliceEstimateService(slicer)

    assert.equal(await service.ensure(file.id, 'FDM_STANDARD'), 'failed')
    assert.isNull(await service.cached(file.sha256, 'FDM_STANDARD'))
    const row = await SliceEstimate.firstOrFail()
    assert.equal(row.status, 'failed')
    assert.include(row.error ?? '', 'profile is invalid')
  })

  test('with no slicer configured nothing is attempted', async ({ assert }) => {
    const file = await storedFile()
    const service = new SliceEstimateService(null)
    assert.isFalse(service.enabled)
    assert.equal(await service.ensure(file.id, 'FDM_STANDARD'), 'disabled')
    assert.lengthOf(await SliceEstimate.query(), 0)
  })

  test('pricing uses the slicer numbers, scaled for the material, and falls back without them', async ({
    assert,
  }) => {
    const profile = await PrintProfile.findByOrFail('code', 'FDM_STANDARD')
    const buyer = await createUser('buyer')
    const file = await createAnalyzedFile(buyer)

    const before = await createDraftOrder(buyer, { printProfileId: profile.id })
    const heuristic = await OrderItem.query().where('orderId', before.order.id).firstOrFail()

    await SliceEstimate.create({
      contentHash: file.sha256,
      profileCode: profile.code,
      status: 'done',
      gramsCenti: 5000,
      supportGramsCenti: 0,
      printMinutes: 300,
      slicer: 'fake',
    })
    const numbers = await slicedNumbers(file, profile, 'PETG')
    assert.exists(numbers)
    assert.isAbove(numbers!.gramsPerUnit, 50, 'PETG is denser than PLA')
    assert.equal(numbers!.printMinutes, 300)
    assert.isNull(await slicedNumbers(file, null, 'PLA'))
    assert.isNull(await slicedNumbers(file, { code: 'SLA_STANDARD', technology: 'SLA' }, 'RESIN'))

    // the same file as an order line: real numbers instead of the volume guess
    const after = await createDraftOrder(buyer, {
      printProfileId: profile.id,
      modelFileId: file.id,
    } as never)
    const sliced = await OrderItem.query().where('orderId', after.order.id).firstOrFail()
    assert.equal(sliced.estPrintMinutes, 300)
    assert.equal(sliced.estGrams, 50)
    assert.notEqual(sliced.estPrintMinutes, heuristic.estPrintMinutes)
  })
})
