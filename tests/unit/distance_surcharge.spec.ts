import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import EligibilityService from '#services/matching/eligibility_service'
import MakerCostProfileService, {
  MakerCostProfileError,
} from '#services/manufacturing/maker_cost_profile_service'
import { distanceBps, orderFloor, type MarketMaker } from '#services/pricing/maker_market'
import { createDraftOrder, createManufacturer, createPrinter } from '#tests/helpers/order_fixtures'

const base = {
  hourlyRateMinor: 1500,
  setupMinor: 0,
  wasteBps: 1000,
  failureBps: 500,
  profitBps: 2500,
}

const maker = (city: string, otherCityBps: number): MarketMaker => ({
  manufacturerProfileId: city,
  city,
  country: 'TR',
  costs: { ...base, otherCityBps, abroadBps: 0 },
  materialCostPerKg: new Map([['PLA', 60_000]]),
})

const lines = [{ material: 'PLA', grams: 100, minutes: 300, finishingMinor: 0 }]

test.group('distance surcharge (Paket V, V5)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('nothing is added in the maker’s own city; another city adds their percent', ({
    assert,
  }) => {
    const ankara = maker('Ankara', 2000)
    const plain = orderFloor(ankara, lines)!
    assert.equal(orderFloor(ankara, lines, { city: 'ankara', country: 'TR' }), plain)
    assert.equal(
      orderFloor(ankara, lines, { city: 'İstanbul', country: 'TR' }),
      Math.ceil(plain * 1.2)
    )
    // an unknown city (a quote) is priced as another city: never too low
    assert.equal(distanceBps(ankara, { city: null, country: 'TR' }), 2000)
  })

  test('a maker cannot add more than the admin maximum', async ({ assert }) => {
    const { profile } = await createManufacturer()
    await assert.rejects(
      () => new MakerCostProfileService().save(profile.id, { ...base, otherCityBps: 5000 }),
      MakerCostProfileError
    )
  })

  test('a far maker with a big surcharge loses the order to an equal maker in town', async ({
    assert,
  }) => {
    // both exactly as dear as the reference maker the order is priced at
    const costs = new MakerCostProfileService()
    const reference = { ...costs.defaults(), otherCityBps: 3000 }
    const local = await createManufacturer({ city: 'Istanbul' })
    await createPrinter(local.profile)
    await costs.save(local.profile.id, reference)
    const far = await createManufacturer({ city: 'Ankara' })
    await createPrinter(far.profile)
    await costs.save(far.profile.id, reference)

    // delivered to Istanbul: with fewer than three makers the budget pays up to the band (15 %)
    // above the reference, so the Istanbul maker fits and the one adding 30 % does not
    const { order } = await createDraftOrder()
    const candidates = await new EligibilityService().findCandidates(order, {
      buyerCity: 'Istanbul',
    })
    const ids = candidates.map((c) => c.manufacturerProfileId)
    assert.include(ids, local.profile.id)
    assert.notInclude(ids, far.profile.id)
  })
})
