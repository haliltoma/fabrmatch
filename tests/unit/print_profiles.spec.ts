import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import OrderItem from '#models/order_item'
import PrintProfile from '#models/print_profile'
import PrintProfileService, { PrintProfileError } from '#services/catalog/print_profile_service'
import EligibilityService, { makerPriceFits } from '#services/matching/eligibility_service'
import MissedOrdersService from '#services/manufacturing/missed_orders_service'
import PrinterMaterial from '#models/printer_material'
import OrderStateMachine from '#services/orders/order_state_machine'
import PrinterService from '#services/manufacturing/printer_service'
import {
  createDraftOrder,
  createManufacturer,
  createPrinter,
  createUser,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'
import { uid } from '#tests/helpers/ids'

const service = new PrintProfileService()

async function profileByCode(code: string) {
  return PrintProfile.findByOrFail('code', code)
}

test.group('print profiles', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('a profile sets technology, infill and print time on the order item', async ({ assert }) => {
    const standard = await profileByCode('FDM_STANDARD')
    const fine = await profileByCode('FDM_FINE')
    const strong = await profileByCode('FDM_STRONG')

    const a = await createDraftOrder(undefined, { printProfileId: standard.id })
    const b = await createDraftOrder(undefined, { printProfileId: fine.id })
    const c = await createDraftOrder(undefined, { printProfileId: strong.id })
    const item = async (id: string) => OrderItem.query().where('orderId', id).firstOrFail()
    const [ia, ib, ic] = [await item(a.order.id), await item(b.order.id), await item(c.order.id)]

    assert.equal(ia.printProfileId, standard.id)
    assert.equal(ia.technology, 'FDM')
    assert.isAbove(ib.estPrintMinutes, ia.estPrintMinutes, 'fine layers take longer')
    assert.isAbove(ic.estGrams, ia.estGrams, 'more infill uses more material')
    assert.isAbove(b.order.totalMinor, a.order.totalMinor)
  })

  test('an inactive or unknown profile is refused', async ({ assert }) => {
    const admin = await createUser('admin')
    const fine = await profileByCode('FDM_FINE')
    await service.setActive(fine.id, false, admin.id)
    await assert.rejects(
      () => createDraftOrder(undefined, { printProfileId: fine.id }),
      /not available/
    )
    await assert.rejects(
      () => createDraftOrder(undefined, { printProfileId: uid(999999) }),
      /not available/
    )
  })

  test('only printers that declared the profile are eligible', async ({ assert }) => {
    const fine = await profileByCode('FDM_FINE')
    const standard = await profileByCode('FDM_STANDARD')
    const generalist = await createManufacturer()
    const coarseOnly = await createManufacturer()
    await createPrinter(generalist.profile)
    const limited = await createPrinter(coarseOnly.profile)
    await service.setOffered(limited.id, 'FDM', [standard.id])

    const { order } = await createDraftOrder(undefined, { printProfileId: fine.id })
    const candidates = await new EligibilityService().findCandidates(order)
    assert.deepEqual(
      candidates.map((c) => c.manufacturerProfileId),
      [generalist.profile.id]
    )

    const plain = await createDraftOrder()
    const everyone = await new EligibilityService().findCandidates(plain.order)
    assert.lengthOf(everyone, 2, 'orders without a profile still go to every printer')
  })

  test('new printers offer every profile of their technology; the maker can narrow it', async ({
    assert,
  }) => {
    const { profile } = await createManufacturer()
    const printer = await new PrinterService().create(profile, {
      name: 'P1',
      technology: 'FDM',
      buildVolumeXMm: 200,
      buildVolumeYMm: 200,
      buildVolumeZMm: 200,
    })
    const fdm = await service.list({ technology: 'FDM', activeOnly: true })
    assert.sameMembers(
      await service.offeredIds(printer.id),
      fdm.map((p) => p.id)
    )

    const sla = await profileByCode('SLA_STANDARD')
    await assert.rejects(() => service.setOffered(printer.id, 'FDM', [sla.id]), PrintProfileError)
    await service.setOffered(printer.id, 'FDM', [fdm[0].id])
    assert.deepEqual(await service.offeredIds(printer.id), [fdm[0].id])
  })

  test('a new profile is offered by existing printers of that technology, audited', async ({
    assert,
  }) => {
    const admin = await createUser('admin')
    const { profile } = await createManufacturer()
    const printer = await createPrinter(profile)
    const created = await service.create(
      {
        code: 'fdm_draft',
        name: 'Draft (0.3 mm)',
        technology: 'FDM',
        layerHeightMicron: 300,
        infillPercent: 10,
        timeFactorBps: 7000,
      },
      admin.id
    )
    assert.equal(created.code, 'FDM_DRAFT')
    assert.include(await service.offeredIds(printer.id), created.id)
    const audit = await db
      .from('audit_logs')
      .where('action', 'catalog.print_profile_created')
      .first()
    assert.equal(audit.subject_id, created.id)
  })

  test('profile input is validated', async ({ assert }) => {
    const admin = await createUser('admin')
    const base = {
      code: 'X1',
      name: 'x',
      technology: 'FDM' as const,
      layerHeightMicron: 200,
      infillPercent: 20,
      timeFactorBps: 10000,
    }
    await assert.rejects(
      () => service.create({ ...base, code: 'FDM_STANDARD' }, admin.id),
      /already exists/
    )
    await assert.rejects(() => service.create({ ...base, infillPercent: 0 }, admin.id), /Infill/)
    await assert.rejects(
      () => service.create({ ...base, layerHeightMicron: 5 }, admin.id),
      /Layer height/
    )
    await assert.rejects(
      () => service.create({ ...base, timeFactorBps: 100 }, admin.id),
      /Time factor/
    )
    await assert.rejects(
      () => service.create({ ...base, code: 'bad code' }, admin.id),
      /Code may use/
    )
  })
})

test.group('maker minimum price (R2-T4)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('a maker asking more than the platform price is not matched', async ({ assert }) => {
    const cheap = await createManufacturer()
    const greedy = await createManufacturer()
    await createPrinter(cheap.profile)
    const printer = await createPrinter(greedy.profile)
    await PrinterMaterial.query()
      .where('printerId', printer.id)
      .update({ price_per_gram_minor: 500 })

    const { order } = await createDraftOrder()
    const candidates = await new EligibilityService().findCandidates(order)
    assert.deepEqual(
      candidates.map((c) => c.manufacturerProfileId),
      [cheap.profile.id]
    )
    assert.isTrue(makerPriceFits(50, 'PLA'))
    assert.isFalse(makerPriceFits(51, 'PLA'))
    assert.isTrue(makerPriceFits(9999, 'UNKNOWNIUM'), 'no reference price, no cap')
  })

  test('the hint counts recent orders the maker missed by price', async ({ assert }) => {
    const maker = await createManufacturer()
    const printer = await createPrinter(maker.profile)
    await PrinterMaterial.query()
      .where('printerId', printer.id)
      .update({ price_per_gram_minor: 500 })
    const { order } = await createDraftOrder()
    const sm = new OrderStateMachine()
    await sm.transition(order.id, 'awaiting_payment')
    await sm.transition(order.id, 'paid')

    const loaded = await db.from('printer_materials').where('printer_id', printer.id)
    const hints = await new MissedOrdersService().forPrinters([
      {
        id: printer.id,
        technology: 'FDM',
        materials: loaded.map((r) => ({
          id: r.id,
          material: r.material,
          pricePerGramMinor: r.price_per_gram_minor,
        })),
      },
    ])
    const [hint] = [...hints.values()]
    assert.equal(hint.missedOrders, 1)
    assert.equal(hint.referencePricePerGramMinor, 50)
  })
})

test.group('technology selection (R2-T6)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('a material must fit the technology of the chosen profile', async ({ assert }) => {
    const sla = await profileByCode('SLA_STANDARD')
    await assert.rejects(
      () => createDraftOrder(undefined, { printProfileId: sla.id, material: 'PLA' }),
      /FDM material/
    )
    const ok = await createDraftOrder(undefined, { printProfileId: sla.id, material: 'RESIN' })
    const item = await OrderItem.query().where('orderId', ok.order.id).firstOrFail()
    assert.equal(item.technology, 'SLA')
  })

  test('an SLA order only reaches SLA printers', async ({ assert }) => {
    const sla = await profileByCode('SLA_STANDARD')
    const fdm = await createManufacturer()
    const resin = await createManufacturer()
    await createPrinter(fdm.profile)
    await createPrinter(resin.profile, { technology: 'SLA', material: 'RESIN' })
    const { order } = await createDraftOrder(undefined, {
      printProfileId: sla.id,
      material: 'RESIN',
    })
    const candidates = await new EligibilityService().findCandidates(order)
    assert.deepEqual(
      candidates.map((c) => c.manufacturerProfileId),
      [resin.profile.id]
    )
  })
})
