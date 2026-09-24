import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import ManufacturerProfile from '#models/manufacturer_profile'
import User from '#models/user'
import MakerSetupService from '#services/manufacturing/maker_setup_service'
import {
  createManufacturer,
  createPrinter,
  createUser,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'

const setup = new MakerSetupService()
const done = (s: Awaited<ReturnType<typeof setup.forProfile>>) =>
  Object.fromEntries(s.steps.map((x) => [x.id, x.done]))

test.group('maker setup checklist (X-13)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('a brand-new maker sees every real step, nothing ticked but what is true', async ({
    assert,
  }) => {
    const { profile } = await createManufacturer()
    await ManufacturerProfile.query().where('id', profile.id).update({ status: 'pending' })
    const fresh = await ManufacturerProfile.findOrFail(profile.id)
    const result = await setup.forProfile(fresh)
    assert.deepEqual(
      result.steps.map((s) => s.id),
      ['approved', 'email', 'printer', 'materials', 'capacity', 'payout']
    )
    assert.deepEqual(done(result), {
      approved: false,
      email: true, // the fixture user is verified
      printer: false,
      materials: false,
      capacity: false,
      payout: false,
    })
    assert.equal(result.doneCount, 1)
    assert.isFalse(result.complete)
    for (const step of result.steps) assert.match(step.href, /^\/maker/)
  })

  test('steps tick themselves as the maker sets things up', async ({ assert }) => {
    const { user, profile } = await createManufacturer()
    let current = await setup.forProfile(profile)
    assert.isTrue(done(current).approved)

    await User.query().where('id', user.id).update({ emailVerifiedAt: null })
    assert.isFalse(done(await setup.forProfile(profile)).email)

    // a printer with material and a slot: three steps at once
    await createPrinter(profile, { slotDate: DateTime.now().plus({ days: 2 }).toISODate()! })
    current = await setup.forProfile(profile)
    assert.include(done(current), { printer: true, materials: true, capacity: true })
    assert.isFalse(current.complete)

    await db.from('manufacturer_profiles').where('id', profile.id).update({ iban_enc: 'x' })
    await User.query().where('id', user.id).update({ emailVerifiedAt: DateTime.now().toSQL() })
    const finished = await setup.forProfile(await ManufacturerProfile.findOrFail(profile.id))
    assert.isTrue(finished.complete)
    assert.equal(finished.doneCount, 6)
  })

  test('a printer with no free hours, or only past ones, does not count as capacity', async ({
    assert,
  }) => {
    const { profile } = await createManufacturer()
    await createPrinter(profile, { slotMinutes: 0 })
    assert.isFalse(done(await setup.forProfile(profile)).capacity)

    const past = await createManufacturer()
    await createPrinter(past.profile, {
      slotDate: DateTime.now().minus({ days: 3 }).toISODate()!,
    })
    assert.isFalse(done(await setup.forProfile(past.profile)).capacity)

    const full = await createManufacturer()
    const printer = await createPrinter(full.profile)
    await db
      .from('capacity_slots')
      .where('printer_id', printer.id)
      .update({ reserved_minutes: db.raw('max_minutes') })
    assert.isFalse(done(await setup.forProfile(full.profile)).capacity)
  })

  test('an inactive printer is ignored, and other makers’ printers never count', async ({
    assert,
  }) => {
    const mine = await createManufacturer()
    const theirs = await createManufacturer()
    await createPrinter(theirs.profile)
    await createPrinter(mine.profile, { isActive: false })
    const result = done(await setup.forProfile(mine.profile))
    assert.include(result, { printer: false, materials: false, capacity: false })
    assert.isDefined(await createUser('unused'))
  })
})
