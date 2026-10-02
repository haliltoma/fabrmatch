import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import fabrmatchConfig from '#config/fabrmatch'
import MakerCostProfileService, {
  MakerCostProfileError,
} from '#services/manufacturing/maker_cost_profile_service'
import { createManufacturer } from '#tests/helpers/order_fixtures'

const costs = {
  hourlyRateMinor: 1500,
  setupMinor: 3000,
  wasteBps: 1000,
  failureBps: 500,
  profitBps: 2800,
}

test.group('maker cost profile (Paket V)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a maker without a profile is priced as the reference maker at the minimum profit', async ({
    assert,
  }) => {
    const { profile } = await createManufacturer()
    const shown = await new MakerCostProfileService().forMaker(profile.id)
    const pay = fabrmatchConfig.makerPay
    assert.isFalse(shown.saved)
    assert.equal(shown.hourlyRateMinor, pay.referenceHourlyRateMinor)
    assert.equal(shown.profitBps, pay.minProfitBps)
  })

  test('saving keeps one profile per maker and reads it back', async ({ assert }) => {
    const { profile } = await createManufacturer()
    const service = new MakerCostProfileService()
    await service.save(profile.id, costs)
    await service.save(profile.id, { ...costs, setupMinor: 1000 })
    const shown = await service.forMaker(profile.id)
    assert.isTrue(shown.saved)
    assert.equal(shown.setupMinor, 1000)
    assert.equal(shown.profitBps, 2800)
  })

  test('the profit must stay within the admin limits', async ({ assert }) => {
    const { profile } = await createManufacturer()
    const service = new MakerCostProfileService()
    await assert.rejects(
      () => service.save(profile.id, { ...costs, profitBps: 1000 }),
      MakerCostProfileError
    )
    await assert.rejects(
      () => service.save(profile.id, { ...costs, profitBps: 5000 }),
      MakerCostProfileError
    )
  })

  test('when the admin raises the minimum, a saved lower profit follows it', async ({
    assert,
    cleanup,
  }) => {
    const { profile } = await createManufacturer()
    const service = new MakerCostProfileService()
    await service.save(profile.id, { ...costs, profitBps: 2500 })
    const before = fabrmatchConfig.makerPay.minProfitBps
    fabrmatchConfig.makerPay.minProfitBps = 2700
    cleanup(() => {
      fabrmatchConfig.makerPay.minProfitBps = before
    })
    const shown = await service.forMaker(profile.id)
    assert.equal(shown.profitBps, 2700)
  })
})
