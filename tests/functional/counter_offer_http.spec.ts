import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import MatchOffer from '#models/match_offer'
import Order from '#models/order'
import type User from '#models/user'
import MatchingService from '#services/matching/matching_service'
import type { MatchingEffects } from '#services/matching/matching_effects'
import OrderStateMachine from '#services/orders/order_state_machine'
import RoleService from '#services/identity/role_service'
import MakerCostProfileService from '#services/manufacturing/maker_cost_profile_service'
import {
  createDraftOrder,
  createManufacturer,
  createPrinter,
  createUser,
  offerStatus,
} from '#tests/helpers/order_fixtures'

const quiet: MatchingEffects = {
  async offerCreated() {},
  async offerAccepted() {},
  async orderUnmatched() {},
}

test.group('counter-offers over HTTP (Paket V, V3)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('the maker asks for more, another maker cannot, the admin approves', async ({
    client,
    assert,
  }) => {
    const maker = await createManufacturer()
    await createPrinter(maker.profile)
    await new RoleService().assignRole(maker.user, 'manufacturer')
    // cheaper than the reference maker the order is priced at, so there is room to ask for more
    await new MakerCostProfileService().save(maker.profile.id, {
      hourlyRateMinor: 1000,
      setupMinor: 0,
      wasteBps: 1000,
      failureBps: 500,
      profitBps: 2500,
    })
    const { order } = await createDraftOrder()
    const sm = new OrderStateMachine()
    await sm.transition(order.id, 'awaiting_payment')
    await sm.transition(order.id, 'paid')
    const offer = (await new MatchingService(quiet, () => 0.99).start(order.id))!
    const fresh = await Order.findOrFail(order.id)
    const ask = Math.min(offer.makerPayMinor! + 100, fresh.makerBudgetMinor!)
    assert.isAbove(ask, offer.makerPayMinor!)

    const intruder = await createManufacturer()
    await new RoleService().assignRole(intruder.user, 'manufacturer')
    await client
      .post(`/maker/offers/${offer.id}/counter`)
      .loginAs(intruder.user)
      .withCsrfToken()
      .form({ amountMinor: ask })
    assert.equal(await offerStatus(offer.id), 'pending')

    const sent = await client
      .post(`/maker/offers/${offer.id}/counter`)
      .loginAs(maker.user)
      .withCsrfToken()
      .header('referer', '/maker/work')
      .form({ amountMinor: ask })
    sent.assertRedirectsTo('/maker/work')
    assert.equal(await offerStatus(offer.id), 'countered')

    const admin: User = await createUser('admin')
    await new RoleService().assignRole(admin, 'admin')
    const approved = await client
      .post(`/admin/matching/offers/${offer.id}/approve-counter`)
      .loginAs(admin)
      .withCsrfToken()
    approved.assertRedirectsTo(`/admin/matching/${order.id}`)
    const accepted = await MatchOffer.findOrFail(offer.id)
    assert.equal(accepted.status, 'accepted')
    assert.equal(accepted.makerPayMinor, ask)
  })
})
