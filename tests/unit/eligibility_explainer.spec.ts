import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import PrinterMaterial from '#models/printer_material'
import EligibilityExplainer, { type MakerVerdict } from '#services/matching/eligibility_explainer'
import EligibilityService from '#services/matching/eligibility_service'
import {
  createDraftOrder,
  createManufacturer,
  createPrinter,
  createUser,
} from '#tests/helpers/order_fixtures'

const codes = (v: MakerVerdict | undefined) => [
  ...(v?.reasons.map((r) => r.code) ?? []),
  ...(v?.printers.flatMap((p) => p.reasons.map((r) => r.code)) ?? []),
]

test.group('eligibility explainer', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('each broken rule is named, and a fitting maker has no reasons', async ({ assert }) => {
    const buyer = await createUser('buyer')
    const { order } = await createDraftOrder(buyer)

    const fits = await createManufacturer()
    await createPrinter(fits.profile)

    const pending = await createManufacturer()
    pending.profile.status = 'pending' as 'active'
    await pending.profile.save()
    await createPrinter(pending.profile)

    const abroad = await createManufacturer({ country: 'DE' })
    await createPrinter(abroad.profile)

    const noCapacity = await createManufacturer()
    await createPrinter(noCapacity.profile, { slotMinutes: 0 })

    const tiny = await createManufacturer()
    await createPrinter(tiny.profile, { build: [5, 5, 5] })

    const petgOnly = await createManufacturer()
    await createPrinter(petgOnly.profile, { material: 'PETG' })

    const pricey = await createManufacturer()
    const printer = await createPrinter(pricey.profile)
    await PrinterMaterial.query()
      .where('printerId', printer.id)
      .update({ materialCostPerKgMinor: 999_000 })

    const noPrinter = await createManufacturer()

    const idle = await createManufacturer()
    await createPrinter(idle.profile, { isActive: false })

    const ownOrder = await createManufacturer()
    ownOrder.profile.userId = buyer.id
    await ownOrder.profile.save()
    await createPrinter(ownOrder.profile)

    const verdicts = await new EligibilityExplainer().explain(order)
    const of = (id: string) => verdicts.find((v) => v.manufacturerProfileId === id)

    assert.isTrue(of(fits.profile.id)!.eligible)
    assert.deepEqual(codes(of(fits.profile.id)), [])
    assert.include(codes(of(pending.profile.id)), 'not_approved')
    assert.include(codes(of(abroad.profile.id)), 'other_country')
    assert.include(codes(of(noCapacity.profile.id)), 'no_capacity')
    assert.include(codes(of(tiny.profile.id)), 'too_small')
    assert.include(codes(of(petgOnly.profile.id)), 'material_missing')
    assert.include(codes(of(pricey.profile.id)), 'price_above_reference')
    assert.include(codes(of(noPrinter.profile.id)), 'no_printer')
    assert.isTrue(of(noPrinter.profile.id)!.blocked)
    assert.include(codes(of(idle.profile.id)), 'no_active_printer')
    assert.isFalse(of(idle.profile.id)!.blocked)
    assert.include(codes(of(ownOrder.profile.id)), 'is_buyer')

    const tooSmall = of(tiny.profile.id)!.printers[0].reasons.find((r) => r.code === 'too_small')
    assert.deepEqual(tooSmall && 'build' in tooSmall ? tooSmall.build : null, [5, 5, 5])
  })

  test('a maker who already had the order is named as such', async ({ assert }) => {
    const { order } = await createDraftOrder()
    const m = await createManufacturer()
    await createPrinter(m.profile)
    const verdicts = await new EligibilityExplainer().explain(order, {
      offeredStatuses: new Map([[m.profile.id, 'declined']]),
    })
    assert.include(
      codes(verdicts.find((v) => v.manufacturerProfileId === m.profile.id)),
      'already_offered'
    )
  })

  test('stays in step with the matcher: eligible here ⇔ candidate there', async ({ assert }) => {
    const { order } = await createDraftOrder()
    const setups: Array<Parameters<typeof createPrinter>[1]> = [
      {},
      { slotMinutes: 0 },
      { build: [5, 5, 5] },
      { material: 'PETG' },
      { technology: 'SLA' },
      { isActive: false },
      { slotDate: DateTime.now().plus({ days: 30 }).toISODate()! },
      { colors: ['red'] },
      {},
    ]
    for (const opts of setups) {
      const m = await createManufacturer()
      await createPrinter(m.profile, opts)
    }
    const abroad = await createManufacturer({ country: 'DE' })
    await createPrinter(abroad.profile)

    const candidates = await new EligibilityService().findCandidates(order)
    const verdicts = await new EligibilityExplainer().explain(order)
    assert.sameMembers(
      verdicts.filter((v) => v.eligible).map((v) => v.manufacturerProfileId),
      candidates.map((c) => c.manufacturerProfileId)
    )
    assert.isAtLeast(candidates.length, 2)
  })
})
