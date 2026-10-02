import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Material from '#models/material'
import PrinterService from '#services/manufacturing/printer_service'
import ReferenceCatalogService from '#services/catalog/reference_catalog_service'
import {
  createManufacturer,
  createPrinter,
  createUser,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'

const catalog = new ReferenceCatalogService()

test.group('ReferenceCatalogService', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('the seeded catalogue covers the technologies', async ({ assert }) => {
    const materials = await catalog.listMaterials()
    const codes = materials.map((m) => m.code)
    assert.includeMembers(codes, ['PLA', 'PETG', 'ABS', 'TPU', 'NYLON', 'RESIN'])
    assert.equal(materials.find((m) => m.code === 'RESIN')!.technology, 'SLA')
  })

  test('a maker can only offer catalogue materials and colours, canonicalised', async ({
    assert,
  }) => {
    const { profile } = await createManufacturer()
    const printer = await createPrinter(profile)
    const service = new PrinterService()

    const offer = await service.addMaterial(printer, {
      material: ' petg ',
      colors: ['black', 'WHITE', 'black'],
      materialCostPerKgMinor: 300000,
    })
    assert.equal(offer.material, 'PETG')
    assert.deepEqual(offer.colors, ['Black', 'White'])

    await assert.rejects(
      () =>
        service.addMaterial(printer, {
          material: 'GOLD',
          colors: ['Black'],
          materialCostPerKgMinor: 1000,
        }),
      /not in the material catalogue/
    )
    await assert.rejects(
      () =>
        service.addMaterial(printer, {
          material: 'PLA',
          colors: ['Puce'],
          materialCostPerKgMinor: 1000,
        }),
      /not in the colour catalogue/
    )
    await assert.rejects(
      () =>
        service.addMaterial(printer, { material: 'PLA', colors: [], materialCostPerKgMinor: 1000 }),
      /at least one colour/
    )
  })

  test('the material must fit the printer technology', async ({ assert }) => {
    const { profile } = await createManufacturer()
    const printer = await createPrinter(profile, { technology: 'FDM' })
    await assert.rejects(
      () =>
        new PrinterService().addMaterial(printer, {
          material: 'RESIN',
          colors: ['Grey'],
          materialCostPerKgMinor: 1000,
        }),
      /SLA material/
    )
  })

  test('retired entries cannot be picked; admin additions can', async ({ assert }) => {
    const admin = await createUser('admin')
    const { profile } = await createManufacturer()
    const printer = await createPrinter(profile)
    const service = new PrinterService()

    const abs = await Material.findByOrFail('code', 'ABS')
    await catalog.setMaterialActive(abs.id, false, admin.id)
    await assert.rejects(
      () =>
        service.addMaterial(printer, {
          material: 'ABS',
          colors: ['Black'],
          materialCostPerKgMinor: 1000,
        }),
      /not in the material catalogue/
    )

    await catalog.createMaterial({ code: 'asa', name: 'ASA', technology: 'FDM' }, admin.id)
    const offer = await service.addMaterial(printer, {
      material: 'ASA',
      colors: ['Black'],
      materialCostPerKgMinor: 1000,
    })
    assert.equal(offer.material, 'ASA')
    await assert.rejects(
      () => catalog.createMaterial({ code: 'ASA', name: 'x', technology: 'FDM' }, admin.id),
      /already exists/
    )
    await assert.rejects(
      () => catalog.createMaterial({ code: 'bad code!', name: 'x', technology: 'FDM' }, admin.id),
      /Code may use/
    )
  })

  test('colour names are unique ignoring case and need a hex swatch', async ({ assert }) => {
    const admin = await createUser('admin')
    await assert.rejects(
      () => catalog.createColor({ name: 'BLACK', hex: '#000000' }, admin.id),
      /already exists/
    )
    await assert.rejects(() => catalog.createColor({ name: 'Teal', hex: 'teal' }, admin.id), /hex/)
    const teal = await catalog.createColor({ name: 'Teal', hex: '#008080' }, admin.id)
    assert.equal(teal.hex, '#008080')
  })
})
