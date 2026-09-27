/* eslint-disable @unicorn/no-await-expression-member -- terse assertions read better inline */
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import MatchOffer from '#models/match_offer'
import Order from '#models/order'
import MatchingService from '#services/matching/matching_service'
import type { MatchingEffects } from '#services/matching/matching_effects'
import OrderStateMachine from '#services/orders/order_state_machine'
import {
  createDraftOrder,
  createManufacturer,
  createPrinter,
  ensureReferenceCatalog,
} from '#tests/helpers/order_fixtures'

const quiet: MatchingEffects = {
  offerCreated: async () => {},
  offerAccepted: async () => {},
  orderUnmatched: async () => {},
}

async function paidOrder() {
  const maker = await createManufacturer()
  await createPrinter(maker.profile)
  const { order } = await createDraftOrder()
  const sm = new OrderStateMachine()
  await sm.transition(order.id, 'awaiting_payment')
  await sm.transition(order.id, 'paid')
  return order
}

const age = (orderId: number) =>
  db
    .from('orders')
    .where('id', orderId)
    .update({ updated_at: DateTime.now().minus({ minutes: 30 }).toSQL() })

test.group('stalled matching is resumed (review fix)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => ensureReferenceCatalog())

  test('a paid order whose matching never started gets its first round', async ({ assert }) => {
    const order = await paidOrder()
    await age(order.id)
    const matching = new MatchingService(quiet, () => 0.99)
    assert.equal(await matching.resumeStalled(), 1)
    assert.equal((await Order.findOrFail(order.id)).status, 'matching')
    assert.exists(
      await MatchOffer.query().where('orderId', order.id).where('status', 'pending').first()
    )
  })

  test('a matching order left without a pending offer gets the next round', async ({ assert }) => {
    const order = await paidOrder()
    const matching = new MatchingService(quiet, () => 0.99)
    const offer = await matching.start(order.id)
    // the offer ran out and the follow-up round never happened
    await MatchOffer.query().where('id', offer!.id).update({ status: 'expired' })
    const second = await createManufacturer()
    await createPrinter(second.profile)
    await age(order.id)

    assert.equal(await matching.resumeStalled(), 1)
    const pending = await MatchOffer.query()
      .where('orderId', order.id)
      .where('status', 'pending')
      .first()
    assert.equal(pending?.manufacturerProfileId, second.profile.id)
  })

  test('fresh orders, held orders and orders with a live offer are left alone', async ({
    assert,
  }) => {
    const fresh = await paidOrder()
    const held = await paidOrder()
    await db.table('fraud_flags').insert({
      order_id: held.id,
      rule: 'test_hold',
      severity: 'hold',
      status: 'open',
      detail: 'test',
      created_at: new Date(),
    })
    await age(held.id)
    const live = await paidOrder()
    const matching = new MatchingService(quiet, () => 0.99)
    await matching.start(live.id)
    await age(live.id)

    assert.equal(await matching.resumeStalled(), 0)
    assert.equal((await Order.findOrFail(fresh.id)).status, 'paid')
    assert.equal((await Order.findOrFail(held.id)).status, 'paid')
  })
})
