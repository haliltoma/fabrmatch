import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Order from '#models/order'
import RoleService from '#services/identity/role_service'
import MatchingService from '#services/matching/matching_service'
import type { MatchingEffects } from '#services/matching/matching_effects'
import OrderStateMachine from '#services/orders/order_state_machine'
import {
  createDraftOrder,
  createManufacturer,
  createPrinter,
  createUser,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'

const quiet: MatchingEffects = {
  offerCreated: async () => {},
  offerAccepted: async () => {},
  orderUnmatched: async () => {},
}

test.group('admin reassign over HTTP (review fix 5)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('an admin sends a stuck order back to matching; nobody else can', async ({ client }) => {
    const maker = await createManufacturer()
    await createPrinter(maker.profile)
    const { order, buyer } = await createDraftOrder()
    const sm = new OrderStateMachine()
    await sm.transition(order.id, 'awaiting_payment')
    await sm.transition(order.id, 'paid')
    const matching = new MatchingService(quiet, () => 0.99)
    const offer = await matching.start(order.id)
    await matching.acceptOffer(offer!.id, maker.profile.id)

    await new RoleService().assignRole(buyer, 'seller')
    const denied = await client
      .post(`/admin/orders/${order.id}/reassign`)
      .loginAs(buyer)
      .withCsrfToken()
      .header('accept', 'application/json')
      .json({ reason: 'no reply' })
    denied.assertStatus(403)

    const admin = await createUser('admin')
    await new RoleService().assignRole(admin, 'admin')
    const ok = await client
      .post(`/admin/orders/${order.id}/reassign`)
      .loginAs(admin)
      .withCsrfToken()
      .redirects(0)
      .json({ reason: 'no reply for 3 days' })
    ok.assertStatus(302)
    const fresh = await Order.findOrFail(order.id)
    if (fresh.status !== 'matching') throw new Error(`expected matching, got ${fresh.status}`)
  })
})
