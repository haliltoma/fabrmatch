import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import MatchingService, { OfferError } from '#services/matching/matching_service'
import type { MatchingEffects } from '#services/matching/matching_effects'
import { seededRng } from '#services/matching/ranking'
import OrderStateMachine from '#services/orders/order_state_machine'
import Order from '#models/order'
import MatchOffer from '#models/match_offer'
import ProductionJob from '#models/production_job'
import CapacitySlot from '#models/capacity_slot'
import FileAccessGrant from '#models/file_access_grant'
import AuditLog from '#models/audit_log'
import type ProductionJobModel from '#models/production_job'
import type User from '#models/user'
import {
  createDraftOrder,
  createManufacturer,
  createPrinter,
  offerStatus,
  orderStatus,
  resetDatabase,
} from '#tests/helpers/order_fixtures'

class RecordingEffects implements MatchingEffects {
  offers: string[] = []
  accepted: string[] = []
  unmatched: Array<{ orderId: string; reason: string }> = []
  async offerCreated(offer: MatchOffer) {
    this.offers.push(offer.id)
  }
  async offerAccepted(job: ProductionJobModel) {
    this.accepted.push(job.id)
  }
  async orderUnmatched(orderId: string, reason: string) {
    this.unmatched.push({ orderId, reason })
  }
}

async function paidOrder(buyer?: User) {
  const { order, buyer: b, file } = await createDraftOrder(buyer)
  const sm = new OrderStateMachine()
  await sm.transition(order.id, 'awaiting_payment')
  await sm.transition(order.id, 'paid')
  return { order, buyer: b, file }
}

async function makers(n: number) {
  const list = []
  for (let i = 0; i < n; i++) {
    const m = await createManufacturer()
    const printer = await createPrinter(m.profile)
    list.push({ ...m, printer })
  }
  return list
}

function service(effects = new RecordingEffects()) {
  // rng=0.99 → never explore unless the test says otherwise
  return { svc: new MatchingService(effects, () => 0.99), effects }
}

test.group('MatchingService', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('start moves paid → matching and sends a round-1 offer', async ({ assert }) => {
    const [m] = await makers(1)
    const { order } = await paidOrder()
    const { svc, effects } = service()

    const offer = await svc.start(order.id)

    assert.exists(offer)
    assert.equal(offer!.manufacturerProfileId, m.profile.id)
    assert.equal(offer!.printerId, m.printer.id)
    assert.equal(offer!.round, 1)
    assert.equal(offer!.status, 'pending')
    assert.closeTo(offer!.expiresAt.diffNow('minutes').minutes, 30, 0.5)

    const fresh = await Order.findOrFail(order.id)
    assert.equal(fresh.status, 'matching')
    assert.equal(fresh.matchingRound, 1)
    assert.deepEqual(effects.offers, [offer!.id])
  })

  test('runRound is idempotent while an offer is pending', async ({ assert }) => {
    await makers(2)
    const { order } = await paidOrder()
    const { svc } = service()

    await svc.start(order.id)
    assert.isNull(await svc.runRound(order.id))
    assert.isNull(await svc.runRound(order.id))

    const offers = await MatchOffer.query().where('orderId', order.id)
    assert.lengthOf(offers, 1)
  })

  test('decline hands the order to a different manufacturer next round', async ({ assert }) => {
    await makers(2)
    const { order } = await paidOrder()
    const { svc } = service()

    const first = await svc.start(order.id)
    const second = await svc.declineOffer(first!.id, first!.manufacturerProfileId)

    assert.exists(second)
    assert.equal(second!.round, 2)
    assert.notEqual(second!.manufacturerProfileId, first!.manufacturerProfileId)
    assert.equal(await offerStatus(first!.id), 'declined')
  })

  test('after 5 rounds without acceptance the order becomes unmatched', async ({ assert }) => {
    await makers(7)
    const { order } = await paidOrder()
    const { svc, effects } = service()

    let offer = await svc.start(order.id)
    for (let i = 0; i < 5; i++) {
      offer = await svc.declineOffer(offer!.id, offer!.manufacturerProfileId)
    }

    assert.isNull(offer)
    assert.equal(await orderStatus(order.id), 'unmatched')
    assert.lengthOf(await MatchOffer.query().where('orderId', order.id), 5)
    assert.deepEqual(effects.unmatched, [{ orderId: order.id, reason: 'max_rounds' }])
  })

  test('no eligible candidates → unmatched immediately', async ({ assert }) => {
    const { order } = await paidOrder()
    const { svc, effects } = service()

    assert.isNull(await svc.start(order.id))
    assert.equal(await orderStatus(order.id), 'unmatched')
    assert.deepEqual(effects.unmatched, [{ orderId: order.id, reason: 'no_candidates' }])
  })

  test('exploration offers are flagged', async ({ assert }) => {
    await makers(1)
    const { order } = await paidOrder()
    const svc = new MatchingService(new RecordingEffects(), () => 0)

    const offer = await svc.start(order.id)
    assert.isTrue(offer!.isExploration)
  })

  test('accept reserves capacity, creates job + file grant, order in_production', async ({
    assert,
  }) => {
    const [m] = await makers(1)
    const { order } = await paidOrder()
    const { svc, effects } = service()

    const offer = await svc.start(order.id)
    const job = await svc.acceptOffer(offer!.id, m.profile.id, m.user.id)

    await order.load('items')
    const minutes = order.items[0].estPrintMinutes

    assert.equal(job.status, 'accepted')
    assert.equal(job.printerId, m.printer.id)
    assert.closeTo(job.dueAt.diffNow('days').days, 5, 0.01)
    assert.equal(await orderStatus(order.id), 'in_production')
    assert.equal(await offerStatus(offer!.id), 'accepted')

    const slot = await CapacitySlot.query().where('printerId', m.printer.id).firstOrFail()
    assert.equal(slot.reservedMinutes, minutes)

    const grants = await FileAccessGrant.query().where('productionJobId', job.id)
    assert.lengthOf(grants, 1)
    assert.equal(grants[0].manufacturerProfileId, m.profile.id)
    assert.deepEqual(effects.accepted, [job.id])

    const transition = await AuditLog.query()
      .where('subjectId', order.id)
      .where('action', 'order.transition')
      .orderBy('id', 'desc')
      .firstOrFail()
    assert.equal(transition.meta.to, 'in_production')
    assert.equal(transition.actorId, m.user.id)
  })

  test('another manufacturer cannot accept the offer', async ({ assert }) => {
    await makers(1)
    const intruder = await createManufacturer()
    const { order } = await paidOrder()
    const { svc } = service()

    const offer = await svc.start(order.id)
    await assert.rejects(() => svc.acceptOffer(offer!.id, intruder.profile.id), OfferError)
  })

  test('accept fails cleanly if capacity disappeared', async ({ assert }) => {
    const [m] = await makers(1)
    const { order } = await paidOrder()
    const { svc } = service()

    const offer = await svc.start(order.id)
    await CapacitySlot.query().where('printerId', m.printer.id).update({ reserved_minutes: 600 })

    await assert.rejects(() => svc.acceptOffer(offer!.id, m.profile.id), OfferError)
    assert.equal(await offerStatus(offer!.id), 'pending')
    assert.equal(await orderStatus(order.id), 'matching')
    assert.lengthOf(await ProductionJob.query().where('orderId', order.id), 0)
  })

  test('expireOffer is a no-op before expiry, then advances the round', async ({ assert }) => {
    await makers(2)
    const { order } = await paidOrder()
    const { svc } = service()

    const offer = await svc.start(order.id)
    assert.isNull(await svc.expireOffer(offer!.id))
    assert.equal(await offerStatus(offer!.id), 'pending')

    await MatchOffer.query()
      .where('id', offer!.id)
      .update({ expires_at: DateTime.now().minus({ minutes: 1 }).toSQL() })

    const next = await svc.expireOffer(offer!.id)
    assert.equal(await offerStatus(offer!.id), 'expired')
    assert.equal(next!.round, 2)

    // expiring twice does nothing
    assert.isNull(await svc.expireOffer(offer!.id))
  })

  test('expired offer can no longer be accepted', async ({ assert }) => {
    const [m] = await makers(1)
    const { order } = await paidOrder()
    const { svc } = service()

    const offer = await svc.start(order.id)
    await MatchOffer.query()
      .where('id', offer!.id)
      .update({ expires_at: DateTime.now().minus({ minutes: 1 }).toSQL() })

    await assert.rejects(() => svc.acceptOffer(offer!.id, m.profile.id), OfferError)
  })

  test('expireStaleOffers sweeps overdue pending offers', async ({ assert }) => {
    await makers(1)
    const { order } = await paidOrder()
    const { svc } = service()

    const offer = await svc.start(order.id)
    await MatchOffer.query()
      .where('id', offer!.id)
      .update({ expires_at: DateTime.now().minus({ minutes: 5 }).toSQL() })

    assert.equal(await svc.expireStaleOffers(), 1)
    assert.equal(await offerStatus(offer!.id), 'expired')
    // only one maker existed → nobody left → unmatched
    assert.equal(await orderStatus(order.id), 'unmatched')
  })

  test('seeded rng produces reproducible offer sequence', async ({ assert }) => {
    await makers(3)
    const a = await paidOrder()
    const b = await paidOrder()

    const offerA = await new MatchingService(new RecordingEffects(), seededRng(9)).start(a.order.id)
    const offerB = await new MatchingService(new RecordingEffects(), seededRng(9)).start(b.order.id)

    assert.equal(offerA!.manufacturerProfileId, offerB!.manufacturerProfileId)
    assert.equal(offerA!.isExploration, offerB!.isExploration)
  })
})

test.group('MatchingService concurrency (real connections)', (group) => {
  group.each.setup(() => resetDatabase())

  test('double accept race: exactly one wins', async ({ assert }) => {
    const [m] = await makers(1)
    const { order } = await paidOrder()
    const { svc } = service()
    const offer = await svc.start(order.id)

    const results = await Promise.allSettled([
      svc.acceptOffer(offer!.id, m.profile.id),
      svc.acceptOffer(offer!.id, m.profile.id),
      svc.acceptOffer(offer!.id, m.profile.id),
    ])

    assert.lengthOf(
      results.filter((r) => r.status === 'fulfilled'),
      1
    )
    for (const r of results.filter((x) => x.status === 'rejected')) {
      assert.instanceOf((r as PromiseRejectedResult).reason, OfferError)
    }
    assert.lengthOf(await ProductionJob.query().where('orderId', order.id), 1)

    await order.load('items')
    const slot = await CapacitySlot.query().where('printerId', m.printer.id).firstOrFail()
    assert.equal(slot.reservedMinutes, order.items[0].estPrintMinutes)
  })

  test('accept racing decline: never both', async ({ assert }) => {
    await makers(2)
    const { order } = await paidOrder()
    const { svc } = service()
    const offer = await svc.start(order.id)

    const results = await Promise.allSettled([
      svc.acceptOffer(offer!.id, offer!.manufacturerProfileId),
      svc.declineOffer(offer!.id, offer!.manufacturerProfileId),
    ])

    assert.lengthOf(
      results.filter((r) => r.status === 'fulfilled'),
      1
    )
    const final = await MatchOffer.findOrFail(offer!.id)
    assert.oneOf(final.status, ['accepted', 'declined'])
    const jobs = await ProductionJob.query().where('orderId', order.id)
    assert.lengthOf(jobs, final.status === 'accepted' ? 1 : 0)
  })
})
