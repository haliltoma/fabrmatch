import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import ManufacturerProfile from '#models/manufacturer_profile'
import GrowthService from '#services/growth/growth_service'
import {
  createManufacturer,
  createPrinter,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'

const growth = new GrowthService()

test.group('maker activation metric (M1-T3)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('counts makers who are really ready, and those who got ready in time', async ({
    assert,
  }) => {
    const quick = await createManufacturer()
    const slow = await createManufacturer()
    const idle = await createManufacturer() // approved but nothing set up
    const old = await createManufacturer() // outside the cohort window
    for (const m of [quick, slow]) await createPrinter(m.profile)
    await createPrinter(old.profile)

    await db
      .from('manufacturer_profiles')
      .where('id', quick.profile.id)
      .update({ created_at: DateTime.now().minus({ days: 3 }).toSQL() })
    await db
      .from('manufacturer_profiles')
      .where('id', slow.profile.id)
      .update({ created_at: DateTime.now().minus({ days: 40 }).toSQL() })
    await db
      .from('manufacturer_profiles')
      .where('id', old.profile.id)
      .update({ created_at: DateTime.now().minus({ days: 200 }).toSQL() })
    // the slow maker only added free hours a month after signing up: not "within 14 days"
    await db
      .from('capacity_slots')
      .whereIn(
        'printer_id',
        db.from('printers').where('manufacturer_profile_id', slow.profile.id).select('id')
      )
      .update({ created_at: DateTime.now().minus({ days: 5 }).toSQL() })

    const result = await growth.makerActivation(90, 14)
    assert.deepEqual(result, {
      cohortDays: 90,
      targetDays: 14,
      makers: 3, // quick, slow, idle (old is outside the window)
      ready: 2,
      readyWithinTarget: 1,
    })
    assert.isDefined(idle)
  })

  test('a maker who is not approved, or has no free hours or material, is not ready', async ({
    assert,
  }) => {
    const pending = await createManufacturer()
    await createPrinter(pending.profile)
    await ManufacturerProfile.query().where('id', pending.profile.id).update({ status: 'pending' })

    const noHours = await createManufacturer()
    await createPrinter(noHours.profile, { slotMinutes: 0 })

    const noMaterial = await createManufacturer()
    const printer = await createPrinter(noMaterial.profile)
    await db.from('printer_materials').where('printer_id', printer.id).delete()

    const result = await growth.makerActivation()
    assert.equal(result.makers, 2) // the pending one is not counted at all
    assert.equal(result.ready, 0)
    assert.equal(result.readyWithinTarget, 0)
  })
})
