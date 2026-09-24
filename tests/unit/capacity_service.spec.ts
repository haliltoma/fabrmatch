import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import CapacityService from '#services/manufacturing/capacity_service'
import PrinterService from '#services/manufacturing/printer_service'
import ManufacturerProfile from '#models/manufacturer_profile'
import User from '#models/user'

test.group('CapacityService', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  async function createPrinter() {
    const user = await User.create({
      fullName: 'Cap Maker',
      email: `cap-${Date.now()}@test.com`,
      password: 'password123',
    })
    const profile = await ManufacturerProfile.create({
      userId: user.id,
      publicAlias: `FM-${Date.now().toString(36).slice(-4).toUpperCase()}`,
      country: 'TR',
      isCorporate: false,
      status: 'active',
    })
    const printerService = new PrinterService()
    const printer = await printerService.create(profile, {
      name: 'Test FDM',
      technology: 'FDM',
      buildVolumeXMm: 220,
      buildVolumeYMm: 220,
      buildVolumeZMm: 250,
    })
    return { user, profile, printer }
  }

  test('sets and retrieves capacity slot', async ({ assert }) => {
    const { printer } = await createPrinter()
    const service = new CapacityService()

    await service.setSlot(printer.id, '2026-10-01', 480)
    const slots = await service.getSlots(printer.id, '2026-10-01', '2026-10-01')

    assert.equal(slots.length, 1)
    assert.equal(slots[0].maxMinutes, 480)
    assert.equal(slots[0].reservedMinutes, 0)
  })

  test('reserves minutes atomically', async ({ assert }) => {
    const { printer } = await createPrinter()
    const service = new CapacityService()

    await service.setSlot(printer.id, '2026-10-01', 480)

    const ok = await service.reserveMinutes(printer.id, '2026-10-01', 120)
    assert.isTrue(ok)

    const slots = await service.getSlots(printer.id, '2026-10-01', '2026-10-01')
    assert.equal(slots[0].reservedMinutes, 120)
  })

  test('rejects reservation exceeding capacity', async ({ assert }) => {
    const { printer } = await createPrinter()
    const service = new CapacityService()

    await service.setSlot(printer.id, '2026-10-01', 480)
    await service.reserveMinutes(printer.id, '2026-10-01', 400)

    const ok = await service.reserveMinutes(printer.id, '2026-10-01', 100)
    assert.isFalse(ok)

    const slots = await service.getSlots(printer.id, '2026-10-01', '2026-10-01')
    assert.equal(slots[0].reservedMinutes, 400)
  })

  test('concurrent reservations do not double-book', async ({ assert }) => {
    const { printer } = await createPrinter()
    const service = new CapacityService()

    await service.setSlot(printer.id, '2026-10-01', 100)

    const results = await Promise.all([
      service.reserveMinutes(printer.id, '2026-10-01', 60),
      service.reserveMinutes(printer.id, '2026-10-01', 60),
    ])

    const successes = results.filter(Boolean).length
    assert.equal(successes, 1)

    const slots = await service.getSlots(printer.id, '2026-10-01', '2026-10-01')
    assert.equal(slots[0].reservedMinutes, 60)
  })

  test('releases reserved minutes', async ({ assert }) => {
    const { printer } = await createPrinter()
    const service = new CapacityService()

    await service.setSlot(printer.id, '2026-10-01', 480)
    await service.reserveMinutes(printer.id, '2026-10-01', 200)
    await service.releaseMinutes(printer.id, '2026-10-01', 80)

    const slots = await service.getSlots(printer.id, '2026-10-01', '2026-10-01')
    assert.equal(slots[0].reservedMinutes, 120)
  })

  test('applies weekly template to generate slots', async ({ assert }) => {
    const { printer } = await createPrinter()
    const service = new CapacityService()

    await service.setWeeklyTemplate(printer, {
      '1': 480,
      '2': 480,
      '3': 480,
      '4': 480,
      '5': 480,
    })

    const count = await service.applyTemplate(printer.id, '2026-09-28', '2026-10-04')
    assert.isAbove(count, 0)

    const slots = await service.getSlots(printer.id, '2026-09-28', '2026-10-04')
    assert.isAbove(slots.length, 0)
    slots.forEach((s) => assert.equal(s.maxMinutes, 480))
  })
})
