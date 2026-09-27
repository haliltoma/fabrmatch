import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Printer from '#models/printer'
import PrinterModel from '#models/printer_model'
import RoleService from '#services/identity/role_service'
import { createManufacturer, ensureReferenceCatalog } from '#tests/helpers/order_fixtures'

const inertia = { 'x-inertia': 'true', 'x-inertia-version': '1', 'accept': 'application/json' }

test.group('printer model catalogue over HTTP (X-14)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  async function maker() {
    const { user, profile } = await createManufacturer()
    await new RoleService().assignRole(user, 'manufacturer')
    return { user, profile }
  }

  test('the add-printer page carries the catalogue', async ({ client, assert }) => {
    const { user } = await maker()
    const page = await client.get('/maker/printers').headers(inertia).loginAs(user)
    page.assertStatus(200)
    const models = page.body().props.printerModels
    assert.isAbove(models.length, 40)
    assert.includeMembers(
      models.map((m: { brand: string }) => m.brand),
      ['Bambu Lab', 'Prusa', 'Creality', 'Elegoo', 'Formlabs']
    )
    for (const key of ['brand', 'model', 'technology', 'buildVolumeXMm', 'enclosed']) {
      assert.property(models[0], key)
    }
  })

  test('adding by catalogue model links the machine and shows it in the list', async ({
    client,
    assert,
  }) => {
    const { user, profile } = await maker()
    const model = await PrinterModel.query().where('model', 'P1S').firstOrFail()

    const saved = await client
      .post('/maker/printers')
      .loginAs(user)
      .withCsrfToken()
      .headers(inertia)
      .redirects(0)
      .field('name', 'Bambu Lab P1S')
      .field('printerModelId', String(model.id))
      .field('technology', 'FDM')
      .field('buildVolumeXMm', '256')
      .field('buildVolumeYMm', '256')
      .field('buildVolumeZMm', '256')
    saved.assertStatus(302)

    const printer = await Printer.query().where('manufacturerProfileId', profile.id).firstOrFail()
    assert.equal(printer.printerModelId, model.id)
    assert.equal(printer.buildVolumeXMm, 256)

    const page = await client.get('/maker/printers').headers(inertia).loginAs(user)
    assert.equal(page.body().props.printers[0].printerModel, 'Bambu Lab P1S')
  })

  test('the custom path (no model) still works, a bogus id is refused', async ({
    client,
    assert,
  }) => {
    const { user, profile } = await maker()

    const custom = await client
      .post('/maker/printers')
      .loginAs(user)
      .withCsrfToken()
      .headers(inertia)
      .redirects(0)
      .field('name', 'Self-built')
      .field('printerModelId', '')
      .field('technology', 'FDM')
      .field('buildVolumeXMm', '220')
      .field('buildVolumeYMm', '220')
      .field('buildVolumeZMm', '250')
    custom.assertStatus(302)
    const printer = await Printer.query().where('manufacturerProfileId', profile.id).firstOrFail()
    assert.isNull(printer.printerModelId)

    const bogus = await client
      .post('/maker/printers')
      .loginAs(user)
      .withCsrfToken()
      .headers(inertia)
      .redirects(0)
      .field('name', 'Ghost')
      .field('printerModelId', '99999999')
      .field('technology', 'FDM')
      .field('buildVolumeXMm', '220')
      .field('buildVolumeYMm', '220')
      .field('buildVolumeZMm', '250')
    // DomainError: flash + back, no machine created
    bogus.assertStatus(302)
    const machines = await Printer.query().where('manufacturerProfileId', profile.id)
    assert.lengthOf(machines, 1)
  })
})
