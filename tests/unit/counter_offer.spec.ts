import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import fabrmatchConfig from '#config/fabrmatch'
import MatchOffer from '#models/match_offer'
import Order from '#models/order'
import MatchingService, { OfferError } from '#services/matching/matching_service'
import type { MatchingEffects } from '#services/matching/matching_effects'
import MakerCostProfileService from '#services/manufacturing/maker_cost_profile_service'
import OrderStateMachine from '#services/orders/order_state_machine'
import RoleService from '#services/identity/role_service'
import {
  createDraftOrder,
  createManufacturer,
  createPrinter,
  createUser,
  offerStatus,
  orderStatus,
} from '#tests/helpers/order_fixtures'

const quiet: MatchingEffects = {
  async offerCreated() {},
  async offerAccepted() {},
  async orderUnmatched() {},
}

/** Four makers; the cheapest scores the same as the rest, so offers go in a stable order. */
async function market() {
  const costs = new MakerCostProfileService()
  for (const hourly of [1000, 1200, 1400, 1600]) {
    const m = await createManufacturer()
    await createPrinter(m.profile)
    await costs.save(m.profile.id, {
      hourlyRateMinor: hourly,
      setupMinor: 0,
      wasteBps: 1000,
      failureBps: 500,
      profitBps: 2500,
    })
  }
}

async function offered() {
  await market()
  const { order } = await createDraftOrder()
  const sm = new OrderStateMachine()
  await sm.transition(order.id, 'awaiting_payment')
  await sm.transition(order.id, 'paid')
  const matching = new MatchingService(quiet, () => 0.99)
  const offer = (await matching.start(order.id))!
  const fresh = await Order.findOrFail(order.id)
  return { matching, offer, order: fresh }
}

async function admin() {
  const user = await createUser('admin')
  await new RoleService().assignRole(user, 'admin')
  return user
}

test.group('counter-offers (Paket V, V3)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a maker asks for more within the budget; no other offer goes out meanwhile', async ({
    assert,
  }) => {
    const { matching, offer, order } = await offered()
    const ask = order.makerBudgetMinor!
    const countered = await matching.counterOffer(offer.id, offer.manufacturerProfileId, ask)
    assert.equal(countered.status, 'countered')
    assert.equal(countered.counterPayMinor, ask)
    assert.isAbove(countered.expiresAt.toMillis(), DateTime.now().plus({ minutes: 100 }).toMillis())

    assert.isNull(await matching.runRound(order.id), 'the counter still holds the order')
    const open = await MatchOffer.query().where('orderId', order.id)
    assert.lengthOf(open, 1)
  })

  test('the ask must be above the offer and within what the order pays makers', async ({
    assert,
  }) => {
    const { matching, offer, order } = await offered()
    await assert.rejects(
      () => matching.counterOffer(offer.id, offer.manufacturerProfileId, offer.makerPayMinor!),
      OfferError
    )
    await assert.rejects(
      () =>
        matching.counterOffer(offer.id, offer.manufacturerProfileId, order.makerBudgetMinor! + 1),
      OfferError
    )
    const other = await createManufacturer()
    await assert.rejects(
      () => matching.counterOffer(offer.id, other.profile.id, order.makerBudgetMinor!),
      OfferError
    )
  })

  test('approving gives the maker the job at their price', async ({ assert }) => {
    const { matching, offer, order } = await offered()
    const ask = offer.makerPayMinor! + 1
    assert.isAtMost(ask, order.makerBudgetMinor!)
    await matching.counterOffer(offer.id, offer.manufacturerProfileId, ask)
    const adminUser = await admin()
    const job = await matching.approveCounter(offer.id, adminUser.id)
    assert.equal(job.manufacturerProfileId, offer.manufacturerProfileId)
    assert.equal(job.agreedPayMinor, ask)
    const fresh = await MatchOffer.findOrFail(offer.id)
    assert.equal(fresh.status, 'accepted')
    assert.equal(await orderStatus(order.id), 'in_production')
  })

  test('declining or letting it lapse sends the order to the next maker', async ({ assert }) => {
    const { matching, offer, order } = await offered()
    await matching.counterOffer(offer.id, offer.manufacturerProfileId, order.makerBudgetMinor!)
    const adminUser = await admin()
    const next = await matching.rejectCounter(offer.id, adminUser.id)
    assert.exists(next)
    assert.notEqual(next!.manufacturerProfileId, offer.manufacturerProfileId)
    assert.equal(await offerStatus(offer.id), 'declined')

    // the next maker counters too, and nobody answers in time
    await matching.counterOffer(next!.id, next!.manufacturerProfileId, order.makerBudgetMinor!)
    await MatchOffer.query()
      .where('id', next!.id)
      .update({ expiresAt: DateTime.now().minus({ minutes: 1 }).toSQL() })
    await matching.expireStaleOffers()
    assert.equal(await offerStatus(next!.id), 'expired')
    const third = await MatchOffer.query()
      .where('orderId', order.id)
      .where('status', 'pending')
      .firstOrFail()
    assert.notInclude(
      [offer.manufacturerProfileId, next!.manufacturerProfileId],
      third.manufacturerProfileId
    )
  })

  test('with counter-offers switched off, the maker can only accept or decline', async ({
    assert,
    cleanup,
  }) => {
    const { matching, offer, order } = await offered()
    fabrmatchConfig.matching.counterOffers = 0
    cleanup(() => {
      fabrmatchConfig.matching.counterOffers = 1
    })
    await assert.rejects(
      () => matching.counterOffer(offer.id, offer.manufacturerProfileId, order.makerBudgetMinor!),
      OfferError
    )
  })
})
