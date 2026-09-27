import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import PrinterService from '#services/manufacturing/printer_service'
import PrinterModel from '#models/printer_model'
import DomainError from '#exceptions/domain_error'
import ManufacturerProfile from '#models/manufacturer_profile'
import User from '#models/user'
import { ensureReferenceCatalog } from '#tests/helpers/order_fixtures'

test.group('PrinterService', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  async function createManufacturer() {
    const user = await User.create({
      fullName: 'Test Maker',
      email: `maker-${Date.now()}@test.com`,
      password: 'password123',
    })
    const profile = await ManufacturerProfile.create({
      userId: user.id,
      publicAlias: `FM-${Date.now().toString(36).slice(-4).toUpperCase()}`,
      country: 'TR',
      isCorporate: false,
      status: 'active',
    })
    return { user, profile }
  }

  test('creates printer with correct data', async ({ assert }) => {
    const { profile } = await createManufacturer()
    const service = new PrinterService()

    const printer = await service.create(profile, {
      name: 'Ender 3 V2',
      technology: 'FDM',
      buildVolumeXMm: 220,
      buildVolumeYMm: 220,
      buildVolumeZMm: 250,
    })

    assert.equal(printer.name, 'Ender 3 V2')
    assert.equal(printer.technology, 'FDM')
    assert.equal(printer.buildVolumeXMm, 220)

    await printer.refresh()
    assert.isTrue(printer.isActive)
  })

  test('deactivates and activates printer', async ({ assert }) => {
    const { profile } = await createManufacturer()
    const service = new PrinterService()

    const printer = await service.create(profile, {
      name: 'Prusa MK4',
      technology: 'FDM',
      buildVolumeXMm: 250,
      buildVolumeYMm: 210,
      buildVolumeZMm: 210,
    })

    await service.deactivate(printer)
    assert.isFalse(printer.isActive)

    await service.activate(printer)
    assert.isTrue(printer.isActive)
  })

  test('adds material to printer', async ({ assert }) => {
    const { profile } = await createManufacturer()
    const service = new PrinterService()

    const printer = await service.create(profile, {
      name: 'Anycubic Photon',
      technology: 'SLA',
      buildVolumeXMm: 115,
      buildVolumeYMm: 65,
      buildVolumeZMm: 155,
    })

    const material = await service.addMaterial(printer, {
      material: 'RESIN',
      colors: ['Grey', 'Clear', 'Black'],
      pricePerGramMinor: 150,
    })

    assert.equal(material.material, 'RESIN')
    assert.deepEqual(material.colors, ['Grey', 'Clear', 'Black'])
    assert.equal(material.pricePerGramMinor, 150)
    assert.equal(material.currency, 'TRY')
  })

  test('removes material', async ({ assert }) => {
    const { profile } = await createManufacturer()
    const service = new PrinterService()

    const printer = await service.create(profile, {
      name: 'Test Printer',
      technology: 'FDM',
      buildVolumeXMm: 200,
      buildVolumeYMm: 200,
      buildVolumeZMm: 200,
    })

    const material = await service.addMaterial(printer, {
      material: 'PLA',
      colors: ['White'],
      pricePerGramMinor: 50,
    })

    await service.removeMaterial(material)

    const found = await service.findPrinterForProfile(printer.id, profile.id)
    assert.equal(found!.materials.length, 0)
  })

  test('lists printers for profile only', async ({ assert }) => {
    const maker1 = await createManufacturer()
    const maker2 = await createManufacturer()
    const service = new PrinterService()

    await service.create(maker1.profile, {
      name: 'Maker1 Printer',
      technology: 'FDM',
      buildVolumeXMm: 220,
      buildVolumeYMm: 220,
      buildVolumeZMm: 250,
    })
    await service.create(maker2.profile, {
      name: 'Maker2 Printer',
      technology: 'SLA',
      buildVolumeXMm: 100,
      buildVolumeYMm: 100,
      buildVolumeZMm: 150,
    })

    const list = await service.listForProfile(maker1.profile)
    assert.equal(list.length, 1)
    assert.equal(list[0].name, 'Maker1 Printer')
  })
})

test.group('PrinterService model catalogue (X-14)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  async function createManufacturer() {
    const user = await User.create({
      fullName: 'Test Maker',
      email: `maker-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.com`,
      password: 'password123',
    })
    const profile = await ManufacturerProfile.create({
      userId: user.id,
      publicAlias: `FM-${Date.now().toString(36).slice(-4).toUpperCase()}`,
      country: 'TR',
      isCorporate: false,
      status: 'active',
    })
    return { user, profile }
  }

  test('the worldwide catalogue is seeded, ordered, and carries the frame fact', async ({
    assert,
  }) => {
    const models = await new PrinterService().listModels()
    assert.isAbove(models.length, 40)
    // sorted by brand then model, so the picker's optgroups read naturally
    const keys = models.map((m) => `${m.brand}|${m.model}`)
    assert.deepEqual(
      keys,
      [...keys].sort((a, b) => a.localeCompare(b))
    )
    const p1s = models.find((m) => m.brand === 'Bambu Lab' && m.model === 'P1S')
    assert.exists(p1s)
    assert.equal(p1s!.technology, 'FDM')
    assert.isTrue(p1s!.enclosed)
    const a1 = models.find((m) => m.brand === 'Bambu Lab' && m.model === 'A1')
    assert.isFalse(a1!.enclosed)
  })

  test('a printer can point at a catalogue model and the list preloads it', async ({ assert }) => {
    const { profile } = await createManufacturer()
    const service = new PrinterService()
    const model = await PrinterModel.query().where('model', 'X1 Carbon').firstOrFail()

    const printer = await service.create(profile, {
      name: 'Bambu Lab X1 Carbon',
      printerModelId: model.id,
      technology: model.technology,
      buildVolumeXMm: model.buildVolumeXMm,
      buildVolumeYMm: model.buildVolumeYMm,
      buildVolumeZMm: model.buildVolumeZMm,
    })
    assert.equal(printer.printerModelId, model.id)

    const list = await service.listForProfile(profile)
    assert.equal(list[0].printerModel?.brand, 'Bambu Lab')
    assert.equal(list[0].printerModel?.model, 'X1 Carbon')
  })

  test('an unknown catalogue id is rejected, a missing or null one is fine', async ({ assert }) => {
    const { profile } = await createManufacturer()
    const service = new PrinterService()

    await assert.rejects(
      () =>
        service.create(profile, {
          name: 'Ghost',
          printerModelId: 99_999_999,
          technology: 'FDM',
          buildVolumeXMm: 220,
          buildVolumeYMm: 220,
          buildVolumeZMm: 250,
        }),
      DomainError
    )

    const custom = await service.create(profile, {
      name: 'Self-built Voron',
      printerModelId: null,
      technology: 'FDM',
      buildVolumeXMm: 300,
      buildVolumeYMm: 300,
      buildVolumeZMm: 300,
    })
    assert.isNull(custom.printerModelId)
  })
})
